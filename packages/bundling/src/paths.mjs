// Where authoring scripts write + read intermediate artifacts. One answer
// for both local and CI so the pipeline is location-stable.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function pkgRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function distDir() {
  return join(pkgRoot(), "dist");
}

export function bundleDistPath(kind, pin) {
  return join(distDir(), kind, pin, "bundle.tar.gz");
}

// Teavm's staged artifacts have to land where the web package imports them
// from (`@learnrobotics/teavm-compiler/<file>`), so we write into that
// package's dist regardless of where the CLI runs.
export function teavmStageDir() {
  // packages/bundling → repo root → webassembly/teavm-compiler/dist
  const repoRoot = resolve(pkgRoot(), "..", "..");
  return join(repoRoot, "webassembly", "teavm-compiler", "dist");
}
