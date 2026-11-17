// Fetch Corretto 25, keep only the files ristretto reads (release +
// lib/modules), and re-archive as bundle.tar.gz. Output lands at
// dist/jdk/<pin>/bundle.tar.gz, ready to be fed to upload.mjs. Everything
// else is discarded to keep the download small for the browser.
import { createWriteStream, mkdirSync, rmSync, statSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createGunzip, createGzip } from "node:zlib";
import { spawnSync } from "node:child_process";
import {
  JDK_KEEP,
  JDK_PIN,
  JDK_SOURCE_URL,
  bundleDistPath,
  pkgRoot,
} from "./config.mjs";

const WORK = join(pkgRoot(), "work", "jdk", JDK_PIN);
const OUT = bundleDistPath("jdk", JDK_PIN);

mkdirSync(dirname(OUT), { recursive: true });
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

console.log(`Fetching ${JDK_SOURCE_URL}`);
const resp = await fetch(JDK_SOURCE_URL);
if (!resp.ok || !resp.body) {
  throw new Error(`Download failed: HTTP ${resp.status}`);
}

const archivePath = join(WORK, "corretto.tar.gz");
await pipeline(Readable.fromWeb(resp.body), createWriteStream(archivePath));
console.log(`  ${(statSync(archivePath).size / 1024 / 1024).toFixed(1)} MB`);

// Shell out to tar — rolling our own tar reader for ~200 MB of entries is
// not worth it when every developer machine has tar. Extract into WORK and
// then pick out the files we keep.
console.log("Extracting…");
const extractDir = join(WORK, "extracted");
mkdirSync(extractDir, { recursive: true });
const extract = spawnSync(
  "tar",
  ["xzf", archivePath, "-C", extractDir, "--strip-components=1"],
  { stdio: "inherit" },
);
if (extract.status !== 0) {
  throw new Error(`tar xzf failed: ${extract.status}`);
}

// Sanity-check each file we claim to keep. A silent miss here would ship a
// JDK that ristretto can't boot; better to blow up during build.
for (const rel of JDK_KEEP) {
  const abs = join(extractDir, rel);
  const st = statSync(abs);
  if (!st.isFile()) {
    throw new Error(`expected file at ${rel}, got directory/other`);
  }
  console.log(`  keep ${rel}  (${(st.size / 1024 / 1024).toFixed(1)} MB)`);
}

// Walk the extracted tree, list only the kept files + any directory
// ancestors so tar records them.
console.log(`Writing ${OUT}`);
const tarEntries = [];
for (const rel of JDK_KEEP) tarEntries.push(rel);
// The browser-side tar reader synthesizes directories, so we don't need
// explicit directory entries.

const tar = spawnSync(
  "tar",
  [
    "cf",
    "-",
    "-C",
    extractDir,
    "--format=ustar",
    ...tarEntries,
  ],
  { stdio: ["ignore", "pipe", "inherit"] },
);
if (tar.status !== 0) {
  throw new Error(`tar cf failed: ${tar.status}`);
}
const gzip = createGzip({ level: 9 });
await pipeline(Readable.from(tar.stdout), gzip, createWriteStream(OUT));

const outSize = statSync(OUT).size;
console.log(`  bundle.tar.gz = ${(outSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`Done. Run upload.mjs to push to R2.`);
