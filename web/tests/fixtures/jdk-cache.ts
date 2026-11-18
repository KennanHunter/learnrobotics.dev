// Shared fixture that materializes the three wasm artifacts + the
// gzipped JDK tarball as byte providers for pipeline.ts, caching each
// one on disk so repeat runs don't re-download. Only used by the Node
// test harness (web/tests/pipeline.test.ts); browser code paths use
// ?url imports and don't touch this module.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JDK_PIN } from "@learnrobotics/bundling/pins";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "../../..");
const CACHE_DIR = path.join(REPO_ROOT, "web/.cache/bundles");

// JDK_BUNDLE_URL overrides the full URL (useful when the preview
// deployment is broken or the user wants to pin a local dev server);
// otherwise we fall back to the preview /api/bundles proxy, which 302s
// to the R2-signed URL.
const BUNDLES_HOST = "https://preview.learnrobotics.dev";

function jdkBundleUrl(pin: string): string {
  const override = process.env.JDK_BUNDLE_URL;
  if (override) return override;
  return `${BUNDLES_HOST}/api/bundles/jdk/${encodeURIComponent(pin)}`;
}

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function downloadToCache(url: string, destName: string): Promise<Uint8Array> {
  const destPath = path.join(CACHE_DIR, destName);
  if (existsSync(destPath)) {
    return new Uint8Array(await readFile(destPath));
  }
  await ensureCacheDir();
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) {
    throw new Error(`fixture download failed: ${resp.status} ${url}`);
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());
  await writeFile(destPath, bytes);
  return bytes;
}

export async function readJdkTarball(): Promise<Uint8Array> {
  return downloadToCache(jdkBundleUrl(JDK_PIN), `jdk-${JDK_PIN}.tar.gz`);
}

async function readLocalArtifact(subpath: string): Promise<Uint8Array> {
  const abs = path.join(REPO_ROOT, subpath);
  return new Uint8Array(await readFile(abs));
}

export async function readTeavmWasm(): Promise<Uint8Array> {
  return readLocalArtifact("webassembly/teavm-compiler/dist/compiler.wasm");
}

export async function readTeavmSdk(): Promise<Uint8Array> {
  return readLocalArtifact(
    "webassembly/teavm-compiler/dist/compile-classlib-teavm.bin",
  );
}

export async function readRistrettoCore(name: string): Promise<WebAssembly.Module> {
  const bytes = await readLocalArtifact(`webassembly/runtime/dist/${name}`);
  return WebAssembly.compile(bytes);
}
