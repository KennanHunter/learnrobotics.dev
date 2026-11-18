// Pinned bundle catalog. `kind` + `pin` tuple must match what
// packages/bundling authoring has uploaded to R2, or the browser
// fetches a 404 at runtime. Pins are imported from
// @learnrobotics/bundling/pins (the single source of truth); bumping there
// updates authoring + consumer together.
//
// New bundle kinds (e.g. "wpilib", "command-based") go here. `mountPath`
// decides where in the WASI virtual FS the extracted tree lives; the Rust
// runtime treats `java_home` + `classpath` paths as preopen paths.

import { JDK_PIN } from "@learnrobotics/bundling/pins";

export type BundleKind = "jdk" | "library";

export type BundleManifestEntry = {
  kind: BundleKind;
  pin: string;
  mountPath: string;
  // Paths inside mountPath to add to the ristretto classpath. JDK uses
  // java_home instead of classpath entries and leaves this empty.
  classpathJars: readonly string[];
  // Rough uncompressed size; informational, for progress UIs.
  approxBytes: number;
};

export const BUNDLES = {
  jdk: {
    kind: "jdk",
    pin: JDK_PIN,
    mountPath: "/bundles/jdk",
    classpathJars: [],
    approxBytes: 140 * 1024 * 1024,
  },
  // Example shape for a future library bundle. Enable by uploading via
  // packages/bundling (bundling CLI `build-*` + `upload-runtime`) and adding the kind here.
  // wpilib: {
  //   kind: "library",
  //   pin: "2026.1.1",
  //   mountPath: "/bundles/wpilib",
  //   classpathJars: ["wpilibj.jar", "wpiutil.jar"],
  //   approxBytes: 30 * 1024 * 1024,
  // },
} as const satisfies Record<string, BundleManifestEntry>;

export type BundleName = keyof typeof BUNDLES;

export function bundleEntry<N extends BundleName>(name: N): (typeof BUNDLES)[N] {
  return BUNDLES[name];
}
