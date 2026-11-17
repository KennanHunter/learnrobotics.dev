// Runtime-bundle catalog. Each entry is an immutable, pinned tar.gz served
// from R2 at bundles/<kind>/<pin>/bundle.tar.gz and mounted into the
// browser's WASI preopen filesystem. Add a new kind by appending to BUNDLES;
// bump a pin by editing it here and re-running build + upload.
import { bundleKey } from "@learnrobotics/bundling";
import { JDK_PIN, JDK_VERSION } from "@learnrobotics/bundling/pins";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export { R2_BUCKET } from "@learnrobotics/bundling";
export { JDK_PIN, JDK_VERSION } from "@learnrobotics/bundling/pins";

export const JDK_SOURCE_URL = `https://corretto.aws/downloads/resources/${JDK_VERSION}/amazon-corretto-${JDK_VERSION}-linux-x64.tar.gz`;

// Files kept in the extracted JDK. ristretto reads `release` for the
// JAVA_VERSION string and `lib/modules` as the bootstrap jimage. Everything
// else is stripped to keep the bundle small.
export const JDK_KEEP = ["release", "lib/modules"];

export const BUNDLES = [
  {
    kind: "jdk",
    pin: JDK_PIN,
    source: JDK_SOURCE_URL,
    keep: JDK_KEEP,
  },
];

/** Runtime-bundle key: bundles/<kind>/<pin>/bundle.tar.gz. */
export function runtimeBundleKey(kind, pin, filename = "bundle.tar.gz") {
  return bundleKey({ prefix: "bundles", kind, pin, filename });
}

export function pkgRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function distDir() {
  return join(pkgRoot(), "dist");
}

export function bundleDistPath(kind, pin) {
  return join(distDir(), kind, pin, "bundle.tar.gz");
}
