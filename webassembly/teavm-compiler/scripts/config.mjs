// Shared config for upload.mjs and stage.mjs. Account id and bucket are not
// secrets — they're in wrangler.jsonc too. Bump TEAVM_PIN whenever you want a
// new cut from teavm.org/playground; the key prefix is the whole mechanism
// for pinning a reproducible build.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const R2_ACCOUNT_ID = "1de9d7646d10b16be16d4afc4ac9a19b";
export const R2_BUCKET = "learn-robotics-dev-storage";
export const TEAVM_PIN = "2026-11-16";

export const TEAVM_UPSTREAM = "https://teavm.org/playground";
export const TEAVM_FILES = [
  "compiler.wasm",
  "compiler.wasm-runtime.js",
  "compile-classlib-teavm.bin",
  "runtime-classlib-teavm.bin",
];

export function r2Endpoint() {
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function teavmObjectKey(filename) {
  return `teavm/${TEAVM_PIN}/${filename}`;
}

export function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}

export function readR2Credentials() {
  const fromEnv = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  };
  if (fromEnv.accessKeyId && fromEnv.secretAccessKey) return fromEnv;

  const devVars = join(repoRoot(), "web", ".dev.vars");
  let text;
  try {
    text = readFileSync(devVars, "utf8");
  } catch {
    throw new Error(
      `R2 credentials not found. Set R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY in env or ${devVars}.`,
    );
  }
  const vars = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[m[1]] = value;
  }
  if (!vars.R2_ACCESS_KEY_ID || !vars.R2_SECRET_ACCESS_KEY) {
    throw new Error(
      `R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY missing from ${devVars}.`,
    );
  }
  return {
    accessKeyId: vars.R2_ACCESS_KEY_ID,
    secretAccessKey: vars.R2_SECRET_ACCESS_KEY,
  };
}
