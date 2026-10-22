/**
 * Client-side PWA Icon & Manifest engine.
 * Pure browser (Canvas + JSZip). No server.
 */
import type JSZip from "jszip";

export type PwaIconSizes = {
  "apple-touch-icon.png": 180;
  "icon-192.png": 192;
  "icon-512.png": 512;
  "icon-512-maskable.png": 512;
  "favicon-32x32.png": 32;
  "favicon-16x16.png": 16;
};

export type GeneratedIcons = Record<keyof PwaIconSizes, Blob>;

export interface PwaManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: "any" | "maskable" | "any maskable";
  }>;
}

export interface PwaBundle {
  icons: GeneratedIcons;
  faviconIco: Blob;
  manifest: PwaManifest;
  manifestJson: string;
}

const SIZES: PwaIconSizes = {
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512,
  "icon-512-maskable.png": 512,
  "favicon-32x32.png": 32,
  "favicon-16x16.png": 16,
};

function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    if (src instanceof Blob) {
      img.src = URL.createObjectURL(src);
    } else {
      img.src = src;
    }
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob failed"));
      },
      type,
      0.92,
    );
  });
}

function drawIcon(
  img: HTMLImageElement,
  size: number,
  options: { padding?: number; forceOpaque?: boolean; bg?: string } = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const bg = options.bg ?? "#000000";
  if (options.forceOpaque !== false) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }

  const pad = options.padding ?? 0;
  const drawSize = size - pad * 2;
  const scale = Math.min(drawSize / img.width, drawSize / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;

  ctx.drawImage(img, x, y, w, h);
  return canvas;
}

export async function generateIconsFromMaster(
  master: Blob | string,
  background = "#000000",
): Promise<GeneratedIcons> {
  const img = await loadImage(master);
  const result = {} as GeneratedIcons;

  for (const [name, size] of Object.entries(SIZES) as [keyof PwaIconSizes, number][]) {
    const isMaskable = name.includes("maskable");
    const isApple = name.includes("apple");
    const padding = isMaskable ? Math.round(size * 0.2) : 0;
    const canvas = drawIcon(img, size, {
      padding,
      forceOpaque: isApple || isMaskable || true,
      bg: background,
    });
    result[name] = await canvasToBlob(canvas);
  }

  return result;
}

/** Minimal ICO generator (16 + 32) */
export async function generateFaviconIco(icons: GeneratedIcons): Promise<Blob> {
  const i16 = icons["favicon-16x16.png"];
  const i32 = icons["favicon-32x32.png"];
  const b16 = new Uint8Array(await i16.arrayBuffer());
  const b32 = new Uint8Array(await i32.arrayBuffer());

  const header = new Uint8Array(6);
  const view = new DataView(header.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type = ICO
  view.setUint16(4, 2, true); // count

  const dirSize = 16 * 2;
  const offset1 = 6 + dirSize;
  const offset2 = offset1 + b16.length;

  const dir = new Uint8Array(dirSize);
  const d = new DataView(dir.buffer);

  // 16x16
  dir[0] = 16;
  dir[1] = 16;
  dir[2] = 0; // palette
  dir[3] = 0; // reserved
  d.setUint16(4, 1, true); // planes
  d.setUint16(6, 32, true); // bpp
  d.setUint32(8, b16.length, true);
  d.setUint32(12, offset1, true);

  // 32x32
  dir[16] = 32;
  dir[17] = 32;
  dir[18] = 0;
  dir[19] = 0;
  d.setUint16(20, 1, true);
  d.setUint16(22, 32, true);
  d.setUint32(24, b32.length, true);
  d.setUint32(28, offset2, true);

  const out = new Uint8Array(6 + dirSize + b16.length + b32.length);
  out.set(header, 0);
  out.set(dir, 6);
  out.set(b16, offset1);
  out.set(b32, offset2);

  return new Blob([out], { type: "image/x-icon" });
}

export function buildManifest(opts: {
  name: string;
  short_name: string;
  description: string;
  theme_color?: string;
  background_color?: string;
  start_url?: string;
}): PwaManifest {
  const short = opts.short_name.slice(0, 12);
  return {
    name: opts.name,
    short_name: short,
    description: opts.description,
    start_url: opts.start_url ?? "/",
    display: "standalone",
    background_color: opts.background_color ?? "#000000",
    theme_color: opts.theme_color ?? "#c8a16e",
    icons: [
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  };
}

export async function buildPwaBundle(
  master: Blob | string,
  meta: {
    name: string;
    short_name: string;
    description: string;
    theme_color?: string;
    background_color?: string;
  },
): Promise<PwaBundle> {
  const bg = meta.background_color ?? "#000000";
  const icons = await generateIconsFromMaster(master, bg);
  const faviconIco = await generateFaviconIco(icons);
  const manifest = buildManifest(meta);
  const manifestJson = JSON.stringify(manifest, null, 2);
  return { icons, faviconIco, manifest, manifestJson };
}

export async function zipPwaBundle(bundle: PwaBundle): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const [name, blob] of Object.entries(bundle.icons)) {
    zip.file(name, blob);
  }
  zip.file("favicon.ico", bundle.faviconIco);
  zip.file("manifest.json", bundle.manifestJson);
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Integration snippets */
export function nextMetadataSnippet(m: PwaManifest): string {
  return `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: ${JSON.stringify(m.name)},
  description: ${JSON.stringify(m.description)},
  applicationName: ${JSON.stringify(m.short_name)},
  manifest: "/manifest.json",
  themeColor: ${JSON.stringify(m.theme_color)},
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: ${JSON.stringify(m.short_name)},
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};`;
}

export function htmlHeadSnippet(m: PwaManifest): string {
  return `<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="${m.theme_color}">
<meta name="application-name" content="${m.short_name}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${m.short_name}">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" href="/favicon.ico" sizes="any">`;
}
