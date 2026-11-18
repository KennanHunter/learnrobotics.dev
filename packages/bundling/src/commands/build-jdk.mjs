// Fetch Corretto, keep only the files ristretto reads (release +
// lib/modules), and re-archive as bundle.tar.gz at
// packages/bundling/dist/jdk/<pin>/bundle.tar.gz.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { JDK_KEEP, JDK_PIN, JDK_SOURCE_URL } from "../catalog.mjs";
import { bundleDistPath, pkgRoot } from "../paths.mjs";

export async function buildJdk() {
  const work = join(pkgRoot(), "work", "jdk", JDK_PIN);
  const out = bundleDistPath("jdk", JDK_PIN);

  mkdirSync(dirname(out), { recursive: true });
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  console.log(`Fetching ${JDK_SOURCE_URL}`);
  const resp = await fetch(JDK_SOURCE_URL);
  if (!resp.ok || !resp.body) {
    throw new Error(`Download failed: HTTP ${resp.status}`);
  }
  const archive = join(work, "corretto.tar.gz");
  await pipeline(Readable.fromWeb(resp.body), createWriteStream(archive));
  console.log(`  ${(statSync(archive).size / 1024 / 1024).toFixed(1)} MB`);

  // Shell out to tar — every CI image has it, and rolling our own tar
  // reader for ~200 MB of entries is not worth the LOC.
  console.log("Extracting…");
  const extractDir = join(work, "extracted");
  mkdirSync(extractDir, { recursive: true });
  const extract = spawnSync(
    "tar",
    ["xzf", archive, "-C", extractDir, "--strip-components=1"],
    { stdio: "inherit" },
  );
  if (extract.status !== 0) {
    throw new Error(`tar xzf failed: ${extract.status}`);
  }

  // Sanity-check each kept file. A silent miss here would ship a JDK that
  // ristretto can't boot; better to blow up during build.
  for (const rel of JDK_KEEP) {
    const abs = join(extractDir, rel);
    const st = statSync(abs);
    if (!st.isFile()) {
      throw new Error(`expected file at ${rel}, got directory/other`);
    }
    console.log(`  keep ${rel}  (${(st.size / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log(`Writing ${out}`);
  // Stream tar → gzip → file. spawnSync's default maxBuffer is 1 MB; the
  // JDK tar is ~140 MB, which SIGPIPEs tar under spawnSync. Use async
  // spawn with pipe plumbing instead.
  const tar = spawn(
    "tar",
    ["cf", "-", "-C", extractDir, "--format=ustar", ...JDK_KEEP],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const tarExit = new Promise((resolve, reject) => {
    tar.on("error", reject);
    tar.on("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`tar cf exited ${code}${signal ? ` (${signal})` : ""}`)),
    );
  });
  const gzip = createGzip({ level: 9 });
  await Promise.all([
    tarExit,
    pipeline(tar.stdout, gzip, createWriteStream(out)),
  ]);

  const outSize = statSync(out).size;
  console.log(`  bundle.tar.gz = ${(outSize / 1024 / 1024).toFixed(1)} MB`);
}
