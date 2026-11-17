// Teavm-javac artifacts, pinned by date. Four files per pin — the wasm, its
// JS glue, and the two classlib binaries — all served flat under
// teavm/<pin>/<file>. (Flat layout predates the runtime-bundle pattern,
// kept to avoid orphaning existing R2 objects.)
import { bundleKey } from "@learnrobotics/bundling";
import { TEAVM_PIN } from "@learnrobotics/bundling/pins";

export { R2_BUCKET } from "@learnrobotics/bundling";
export { TEAVM_PIN } from "@learnrobotics/bundling/pins";
export const TEAVM_UPSTREAM = "https://teavm.org/playground";
export const TEAVM_FILES = [
  { name: "compiler.wasm", contentType: "application/wasm" },
  { name: "compiler.wasm-runtime.js", contentType: "application/javascript" },
  {
    name: "compile-classlib-teavm.bin",
    contentType: "application/octet-stream",
  },
  {
    name: "runtime-classlib-teavm.bin",
    contentType: "application/octet-stream",
  },
];

export function teavmKey(filename) {
  return bundleKey({ kind: "teavm", pin: TEAVM_PIN, filename });
}
