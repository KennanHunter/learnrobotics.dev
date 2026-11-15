// Generate PNG + ICO variants from the source SVG logos.
// Requires: ImageMagick 7 (`magick`) with librsvg delegate.
//
// Each logo renders in four variants:
//   - light / dark                 (opaque backdrop, theme-paired text)
//   - light-transparent / dark-transparent
//
// Also writes a canonical set into /web/public consumed by VitePWA + the HTML head.
//
// Colors pulled from the single-source-of-truth palette at colors.json.

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import colors from "../colors.json" with { type: "json" };

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "generated");
const webPublic = resolve(here, "..", "web", "public");

const black = `#${colors.Black}`;
const white = `#${colors.White}`;

type Variant = { name: string; fg: string; bg: string | null };

const variants: Variant[] = [
  { name: "light", fg: black, bg: white },
  { name: "dark", fg: white, bg: black },
  { name: "light-transparent", fg: black, bg: null },
  { name: "dark-transparent", fg: white, bg: null },
];

const wordmark = {
  source: "learnrobotics.dev.svg",
  slug: "learnrobotics.dev",
  widths: [320, 640, 1280],
};

const square = {
  source: "lr.d.svg",
  slug: "lr.d",
  sizes: [16, 32, 48, 64, 128, 180, 192, 256, 384, 512, 1024],
};

function render(sourceSvg: string, variant: Variant): string {
  const styleTag = `<style>:root{color:${variant.fg};}</style>`;
  const rect = variant.bg
    ? `<rect width="100%" height="100%" fill="${variant.bg}"/>`
    : "";
  return sourceSvg.replace(/<svg([^>]*)>/, `<svg$1>${styleTag}${rect}`);
}

// Wrap a 256×256 source into a 320×320 viewBox so content sits in the inner
// 80% safe zone required by maskable PWA icons.
function maskableWrap(sourceSvg: string, variant: Variant): string {
  const inner = sourceSvg
    .replace(/<\?xml[^?]*\?>\s*/u, "")
    .replace(/<svg[^>]*>/u, "<g>")
    .replace(/<\/svg>/u, "</g>");
  const bg = variant.bg ?? white;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">`,
    `<style>:root{color:${variant.fg};}</style>`,
    `<rect width="100%" height="100%" fill="${bg}"/>`,
    `<g transform="translate(32,32)">${inner}</g>`,
    `</svg>`,
  ].join("");
}

function run(cmd: string, args: string[]): void {
  execFileSync(cmd, args, { stdio: "inherit" });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(webPublic, { recursive: true });

const tmp = mkdtempSync(join(tmpdir(), "logos-"));

try {
  // Wordmark variants.
  const wordmarkSrc = readFileSync(join(here, wordmark.source), "utf8");
  for (const variant of variants) {
    const svgPath = join(tmp, `${wordmark.slug}-${variant.name}.svg`);
    writeFileSync(svgPath, render(wordmarkSrc, variant));
    for (const w of wordmark.widths) {
      const out = join(outDir, `${wordmark.slug}-${w}-${variant.name}.png`);
      run("magick", [
        "-background",
        "none",
        "-density",
        "384",
        svgPath,
        "-resize",
        `${w}x`,
        out,
      ]);
    }
  }

  // Square variants (source is now 1:1, so NxN resize is faithful).
  const squareSrc = readFileSync(join(here, square.source), "utf8");
  for (const variant of variants) {
    const svgPath = join(tmp, `${square.slug}-${variant.name}.svg`);
    writeFileSync(svgPath, render(squareSrc, variant));
    for (const s of square.sizes) {
      const out = join(outDir, `${square.slug}-${s}-${variant.name}.png`);
      run("magick", [
        "-background",
        "none",
        "-density",
        "384",
        svgPath,
        "-resize",
        `${s}x${s}!`,
        out,
      ]);
    }
  }

  // Multi-resolution favicon from the light-opaque square.
  const faviconSources = [16, 32, 48, 64].map((s) =>
    join(outDir, `${square.slug}-${s}-light.png`),
  );
  run("magick", [...faviconSources, join(outDir, "favicon.ico")]);

  // Maskable PWA icon — padded 320×320 canvas so content lives in inner 80%.
  const maskableSvgPath = join(tmp, `${square.slug}-maskable-light.svg`);
  writeFileSync(
    maskableSvgPath,
    maskableWrap(squareSrc, {
      name: "light",
      fg: black,
      bg: white,
    }),
  );
  const maskablePng = join(outDir, `${square.slug}-maskable-512-light.png`);
  run("magick", [
    "-background",
    "none",
    "-density",
    "384",
    maskableSvgPath,
    "-resize",
    "512x512!",
    maskablePng,
  ]);

  // Theme-aware SVG favicon — same source, but a @media rule flips color
  // based on prefers-color-scheme. Favicons load as <img>, so this is the
  // only way to get OS-theme reactivity for the browser chrome icon.
  const themedFavicon = squareSrc.replace(
    /<svg([^>]*)>/,
    `<svg$1><style>:root{color:${black};}@media (prefers-color-scheme: dark){:root{color:${white};}}</style>`,
  );

  // Canonical set consumed by /web (VitePWA manifest + <link rel="icon">).
  writeFileSync(join(webPublic, "favicon.svg"), themedFavicon);
  copyFileSync(join(outDir, "favicon.ico"), join(webPublic, "favicon.ico"));
  copyFileSync(
    join(outDir, `${square.slug}-180-light.png`),
    join(webPublic, "apple-touch-icon.png"),
  );
  copyFileSync(
    join(outDir, `${square.slug}-192-light.png`),
    join(webPublic, "pwa-192x192.png"),
  );
  copyFileSync(
    join(outDir, `${square.slug}-512-light.png`),
    join(webPublic, "pwa-512x512.png"),
  );
  copyFileSync(maskablePng, join(webPublic, "pwa-maskable-512x512.png"));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`Wrote assets to ${resolve(outDir)}`);
console.log(`Canonical set copied to ${webPublic}`);
