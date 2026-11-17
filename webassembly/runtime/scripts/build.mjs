import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transpileBytes } from "@bytecodealliance/jco-transpile";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(pkg, "..", "..");
const wasmPath = join(
  repoRoot,
  "target",
  "wasm32-wasip2",
  "release",
  "runtime.wasm",
);
const dist = join(pkg, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const { files } = await transpileBytes(readFileSync(wasmPath), {
  name: "runtime",
  instantiation: "async",
  asyncMode: "sync",
  wasiShim: true,
  nodejsCompat: false,
  base64Cutoff: 0,
  emitTypescriptDeclarations: true,
});

for (const [name, bytes] of Object.entries(files)) {
  const out = join(dist, name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, bytes);
}

console.log(`Transpiled runtime component to ${dist}`);
