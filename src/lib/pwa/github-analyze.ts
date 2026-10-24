/**
 * Fetch public GitHub repo metadata and infer PWA fields + icon prompt.
 */
export interface RepoAnalysis {
  owner: string;
  repo: string;
  name: string;
  description: string;
  framework: "next-app" | "next-pages" | "vite-react" | "html" | "php" | "unknown";
  themeColor: string;
  shortName: string;
  iconPrompt: string;
  readmeSnippet: string;
}

const FRAMEWORK_HINTS: Array<{ re: RegExp; fw: RepoAnalysis["framework"] }> = [
  { re: /"next"/, fw: "next-app" },
  { re: /app\/layout\.(tsx|jsx)/, fw: "next-app" },
  { re: /pages\/_app\.(tsx|jsx)/, fw: "next-pages" },
  { re: /"vite"/, fw: "vite-react" },
  { re: /"react"/, fw: "vite-react" },
  { re: /\.php/, fw: "php" },
  { re: /index\.html/, fw: "html" },
];

function detectFramework(pkg: string, treeHint = ""): RepoAnalysis["framework"] {
  const blob = (pkg + "\n" + treeHint).toLowerCase();
  for (const { re, fw } of FRAMEWORK_HINTS) {
    if (re.test(blob)) return fw;
  }
  return "unknown";
}

function shortName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 12) || "App").slice(0, 12);
}

function buildIconPrompt(name: string, description: string, fw: string): string {
  const vibe = description.slice(0, 140) || "modern web tool";
  return `Minimalist app icon for "${name}". ${vibe}. Flat vector style, strong geometric symbol, high contrast, dark background #0a0a0b, accent #c8a16e bronze, no text, centered, suitable as PWA master icon, 512px, ${fw} product.`;
}

export async function analyzeGithubRepo(url: string): Promise<RepoAnalysis> {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!m) throw new Error("Neplatná GitHub URL (očakávaný formát https://github.com/owner/repo)");
  const owner = m[1];
  const repo = m[2].replace(/\.git$/, "");

  const headers = { Accept: "application/vnd.github+json" };

  const [repoRes, pkgRes, readmeRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
  ]);

  if (!repoRes.ok) throw new Error(`Repo nenájdené (${repoRes.status})`);
  const repoJson = await repoRes.json();

  let pkgText = "";
  if (pkgRes.ok) {
    const pkgJson = await pkgRes.json();
    if (pkgJson.content) {
      pkgText = atob(pkgJson.content.replace(/\n/g, ""));
    }
  }

  let readme = "";
  if (readmeRes.ok) {
    const rj = await readmeRes.json();
    if (rj.content) readme = atob(rj.content.replace(/\n/g, ""));
  }

  const framework = detectFramework(pkgText, readme);
  const name = (repoJson.name as string) || repo;
  const description = (repoJson.description as string) || "";
  const themeColor = "#c8a16e";

  return {
    owner,
    repo,
    name,
    description,
    framework,
    themeColor,
    shortName: shortName(name),
    iconPrompt: buildIconPrompt(name, description, framework),
    readmeSnippet: readme.slice(0, 600),
  };
}
