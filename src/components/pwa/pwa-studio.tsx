import { useMemo, useRef, useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Smartphone,
  Sparkles,
  Copy,
  Check,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { analyzeGithubRepo, type RepoAnalysis } from "@/lib/pwa/github-analyze";
import {
  buildPwaBundle,
  downloadBlob,
  htmlHeadSnippet,
  nextMetadataSnippet,
  zipPwaBundle,
  type PwaBundle,
} from "@/lib/pwa/pwa-engine";

type SnippetMode = "next" | "html";

export function PwaStudio() {
  const [githubUrl, setGithubUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);

  const [name, setName] = useState("Blueprint Scanner");
  const [shortName, setShortName] = useState("Blueprint");
  const [description, setDescription] = useState(
    "Public URL → structured frontend reverse-spec.",
  );
  const [themeColor, setThemeColor] = useState("#c8a16e");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [iconPrompt, setIconPrompt] = useState("");

  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [masterBlob, setMasterBlob] = useState<Blob | null>(null);
  const [bundle, setBundle] = useState<PwaBundle | null>(null);
  const [generating, setGenerating] = useState(false);
  const [snippetMode, setSnippetMode] = useState<SnippetMode>("next");
  const [copied, setCopied] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  async function loadFromGithub() {
    if (!githubUrl.trim()) return;
    setAnalyzing(true);
    try {
      const a = await analyzeGithubRepo(githubUrl.trim());
      setAnalysis(a);
      setName(a.name);
      setShortName(a.shortName);
      setDescription(a.description || "PWA generated from GitHub repo");
      setThemeColor(a.themeColor);
      setIconPrompt(a.iconPrompt);
      toast.success("Repo analyzované", { description: `${a.owner}/${a.repo}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analýza zlyhala");
    } finally {
      setAnalyzing(false);
    }
  }

  function onMasterFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Potrebujem obrázok");
      return;
    }
    const url = URL.createObjectURL(file);
    setMasterUrl(url);
    setMasterBlob(file);
    setBundle(null);
  }

  function useLucideFallback() {
    // simple SVG → blob as master
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="#c8a16e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    setMasterUrl(url);
    setMasterBlob(blob);
    setBundle(null);
    toast.message("Minimalistická Lucide-style ikona nastavená");
  }

  async function generate() {
    if (!masterBlob) {
      toast.error("Najprv nahraj Master ikonu");
      return;
    }
    setGenerating(true);
    try {
      const b = await buildPwaBundle(masterBlob, {
        name,
        short_name: shortName,
        description,
        theme_color: themeColor,
        background_color: backgroundColor,
      });
      setBundle(b);
      toast.success("PWA bundle pripravený");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generovanie zlyhalo");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadZip() {
    if (!bundle) return;
    const zip = await zipPwaBundle(bundle);
    downloadBlob(zip, `${shortName || "pwa"}-bundle.zip`);
  }

  const snippet = useMemo(() => {
    if (!bundle) return "";
    return snippetMode === "next"
      ? nextMetadataSnippet(bundle.manifest)
      : htmlHeadSnippet(bundle.manifest);
  }, [bundle, snippetMode]);

  function copySnippet() {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative min-h-dvh bg-bg flex flex-col">
      <div aria-hidden className="ambient-glow" />

      <header className="h-14 shrink-0 border-b border-border px-4 flex items-center gap-3 bg-bg/80 backdrop-blur z-10">
        <div className="p-1.5 rounded-md bg-bg-subtle border border-border text-accent">
          <Sparkles className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">PWA & Asset Studio</div>
          <div className="text-[11px] text-fg-subtle">Master ikona → plný PWA balík</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT */}
          <div className="space-y-5">
            {/* GitHub ingest */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <Github className="size-4 text-accent" />
                Načítať z GitHubu
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void loadFromGithub()}
                  className="mono text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={analyzing || !githubUrl.trim()}
                  onClick={() => void loadFromGithub()}
                >
                  {analyzing ? <Loader2 className="size-4 animate-spin" /> : "Analyzovať"}
                </Button>
              </div>
              {analysis && (
                <p className="mt-2 text-xs text-fg-muted">
                  {analysis.framework} · {analysis.owner}/{analysis.repo}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="panel p-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-fg-subtle sm:col-span-2">
                Name
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </label>
              <label className="text-xs text-fg-subtle">
                short_name (max 12)
                <Input
                  value={shortName}
                  maxLength={12}
                  onChange={(e) => setShortName(e.target.value.slice(0, 12))}
                  className="mt-1"
                />
              </label>
              <label className="text-xs text-fg-subtle">
                theme_color
                <Input
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="mt-1 mono"
                />
              </label>
              <label className="text-xs text-fg-subtle sm:col-span-2">
                Description
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 min-h-[72px]"
                />
              </label>
              <label className="text-xs text-fg-subtle sm:col-span-2">
                AI Icon Prompt
                <Textarea
                  value={iconPrompt}
                  onChange={(e) => setIconPrompt(e.target.value)}
                  className="mt-1 min-h-[80px] mono text-xs"
                  placeholder="Vygeneruje sa po analýze repo..."
                />
              </label>
            </div>

            {/* Master icon */}
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="size-4 text-accent" />
                  Master ikona
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={useLucideFallback}>
                    Lucide fallback
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    Nahrať
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onMasterFile(f);
                    }}
                  />
                </div>
              </div>
              {masterUrl ? (
                <img
                  src={masterUrl}
                  alt="Master"
                  className="w-24 h-24 rounded-xl border border-border object-contain bg-bg"
                />
              ) : (
                <p className="text-xs text-fg-subtle">Žiadna ikona. Nahraj alebo použi Lucide fallback.</p>
              )}
              <Button
                type="button"
                className="mt-4 w-full bg-accent text-accent-fg hover:bg-accent/90"
                disabled={generating || !masterBlob}
                onClick={() => void generate()}
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Vygenerovať PWA bundle
              </Button>
            </div>

            {/* Snippet */}
            {bundle && (
              <div className="panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Integračný kód</div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSnippetMode("next")}
                      className={cn(
                        "text-xs px-2 py-1 rounded-md",
                        snippetMode === "next" ? "bg-bg-subtle text-fg" : "text-fg-muted",
                      )}
                    >
                      Next.js
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnippetMode("html")}
                      className={cn(
                        "text-xs px-2 py-1 rounded-md",
                        snippetMode === "html" ? "bg-bg-subtle text-fg" : "text-fg-muted",
                      )}
                    >
                      HTML
                    </button>
                    <Button type="button" size="sm" variant="ghost" onClick={copySnippet}>
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
                  </div>
                </div>
                <pre className="text-[11px] mono bg-bg rounded-lg p-3 overflow-x-auto border border-border max-h-64">
                  {snippet}
                </pre>
                <Button type="button" className="mt-3 w-full" variant="secondary" onClick={() => void downloadZip()}>
                  <Download className="size-4" />
                  Download PWA Bundle (.ZIP)
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT — Live previews */}
          <aside className="space-y-4">
            <div className="panel p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Smartphone className="size-4 text-accent" />
                Live preview
              </div>

              {/* iOS */}
              <div className="mb-4">
                <div className="text-[11px] text-fg-subtle mb-1.5">iPhone</div>
                <div className="flex flex-col items-center gap-1.5 w-20">
                  <div
                    className="w-16 h-16 rounded-[18px] border border-border overflow-hidden flex items-center justify-center"
                    style={{ background: backgroundColor }}
                  >
                    {masterUrl ? (
                      <img src={masterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[10px] text-fg-subtle">—</div>
                    )}
                  </div>
                  <span className="text-[10px] text-fg truncate max-w-[72px] text-center">
                    {shortName || "App"}
                  </span>
                </div>
              </div>

              {/* Android */}
              <div className="mb-4">
                <div className="text-[11px] text-fg-subtle mb-1.5">Android</div>
                <div className="flex flex-col items-center gap-1.5 w-20">
                  <div
                    className="w-16 h-16 rounded-full border border-border overflow-hidden flex items-center justify-center"
                    style={{ background: backgroundColor }}
                  >
                    {masterUrl ? (
                      <img src={masterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[10px] text-fg-subtle">—</div>
                    )}
                  </div>
                  <span className="text-[10px] text-fg truncate max-w-[72px] text-center">
                    {shortName || "App"}
                  </span>
                </div>
              </div>

              {/* Tab */}
              <div>
                <div className="text-[11px] text-fg-subtle mb-1.5">Desktop tab</div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-2 py-1.5 max-w-[180px]">
                  <div className="w-4 h-4 rounded-sm overflow-hidden bg-bg-subtle shrink-0">
                    {masterUrl && <img src={masterUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-xs truncate">{name || "Untitled"}</span>
                </div>
              </div>
            </div>

            {bundle && (
              <div className="panel p-4 text-xs text-fg-muted space-y-1">
                <div className="font-medium text-fg mb-2">Vygenerované</div>
                <div>apple-touch-icon.png</div>
                <div>icon-192.png · icon-512.png</div>
                <div>icon-512-maskable.png</div>
                <div>favicon-32/16 · favicon.ico</div>
                <div>manifest.json</div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
