// Authoring catalogs: the pinned inputs each subcommand consumes. Pure
// data, no filesystem or network — imported by every subcommand so the
// list of things we mirror lives in one place.
import { bundleKey, R2_BUCKET } from "./key.ts";
import { JDK_PIN, JDK_VERSION, TEAVM_PIN } from "./pins.ts";

export { R2_BUCKET };

// Teavm artifacts are served flat under teavm/<pin>/<file>. This layout
// predates the runtime-bundle tar.gz pattern; keeping it avoids orphaning
// existing R2 objects.
export const TEAVM_UPSTREAM = "https://teavm.org/playground";

export type TeavmFile = { name: string; contentType: string };

export const TEAVM_FILES: readonly TeavmFile[] = [
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

export function teavmKey(filename: string): string {
  return bundleKey({ kind: "teavm", pin: TEAVM_PIN, filename });
}

// Runtime bundles are single tar.gz per pin, mounted into the browser's
// WASI preopen tree at <kind>/<pin>/bundle.tar.gz.
export const JDK_SOURCE_URL = `https://corretto.aws/downloads/resources/${JDK_VERSION}/amazon-corretto-${JDK_VERSION}-linux-x64.tar.gz`;
// Files kept out of the extracted JDK. ristretto reads `release` for the
// JAVA_VERSION string and `lib/modules` as the bootstrap jimage.
export const JDK_KEEP: readonly string[] = ["release", "lib/modules"];

export type RuntimeBundle = {
  kind: string;
  pin: string;
  source: string;
  keep: readonly string[];
};

export const RUNTIME_BUNDLES: readonly RuntimeBundle[] = [
  { kind: "jdk", pin: JDK_PIN, source: JDK_SOURCE_URL, keep: JDK_KEEP },
];

export function runtimeBundleKey(
  kind: string,
  pin: string,
  filename: string = "bundle.tar.gz",
): string {
  return bundleKey({ prefix: "bundles", kind, pin, filename });
}

export { JDK_PIN, JDK_VERSION, TEAVM_PIN };
