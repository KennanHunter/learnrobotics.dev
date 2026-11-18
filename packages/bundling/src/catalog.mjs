// Authoring catalogs: the pinned inputs each subcommand consumes. Pure
// data, no filesystem or network — imported by every subcommand so the
// list of things we mirror lives in one place.
import { bundleKey, R2_BUCKET } from "./key.mjs";
import { JDK_PIN, JDK_VERSION, TEAVM_PIN } from "./pins.mjs";

export { R2_BUCKET };

// Teavm artifacts are served flat under teavm/<pin>/<file>. This layout
// predates the runtime-bundle tar.gz pattern; keeping it avoids orphaning
// existing R2 objects.
export const TEAVM_UPSTREAM = "https://teavm.org/playground";
export const TEAVM_FILES = [
  { name: "compiler.wasm", contentType: "application/wasm" },
  { name: "compiler.wasm-runtime.js", contentType: "application/javascript" },
  { name: "compile-classlib-teavm.bin", contentType: "application/octet-stream" },
  { name: "runtime-classlib-teavm.bin", contentType: "application/octet-stream" },
];

export function teavmKey(filename) {
  return bundleKey({ kind: "teavm", pin: TEAVM_PIN, filename });
}

// Runtime bundles are single tar.gz per pin, mounted into the browser's
// WASI preopen tree at <kind>/<pin>/bundle.tar.gz.
export const JDK_SOURCE_URL = `https://corretto.aws/downloads/resources/${JDK_VERSION}/amazon-corretto-${JDK_VERSION}-linux-x64.tar.gz`;
// Files kept out of the extracted JDK. ristretto reads `release` for the
// JAVA_VERSION string and `lib/modules` as the bootstrap jimage.
export const JDK_KEEP = ["release", "lib/modules"];

export const RUNTIME_BUNDLES = [
  { kind: "jdk", pin: JDK_PIN, source: JDK_SOURCE_URL, keep: JDK_KEEP },
];

export function runtimeBundleKey(kind, pin, filename = "bundle.tar.gz") {
  return bundleKey({ prefix: "bundles", kind, pin, filename });
}

export { JDK_PIN, JDK_VERSION, TEAVM_PIN };
