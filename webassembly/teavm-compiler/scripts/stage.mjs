// Fetch the pinned teavm-javac artifacts from R2 and stage them into dist/.
// The pin lives in config.mjs; upload.mjs is what puts a new pin in R2.
// Reads R2 creds from env or web/.dev.vars — a signed GET per file.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AwsClient } from "aws4fetch";
import {
  R2_BUCKET,
  TEAVM_FILES,
  TEAVM_PIN,
  r2Endpoint,
  readR2Credentials,
  teavmObjectKey,
} from "./config.mjs";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(pkg, "dist");

const creds = readR2Credentials();
const aws = new AwsClient({
  accessKeyId: creds.accessKeyId,
  secretAccessKey: creds.secretAccessKey,
  service: "s3",
  region: "auto",
});

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

console.log(`Staging teavm pin "${TEAVM_PIN}" from ${R2_BUCKET}`);

const results = await Promise.all(
  TEAVM_FILES.map(async (name) => {
    const key = teavmObjectKey(name);
    const url = `${r2Endpoint()}/${R2_BUCKET}/${key}`;
    const resp = await aws.fetch(url);
    if (!resp.ok) {
      return { name, key, ok: false, status: resp.status };
    }
    const bytes = new Uint8Array(await resp.arrayBuffer());
    writeFileSync(join(dist, name), bytes);
    return { name, key, ok: true, bytes: bytes.length };
  }),
);

let failed = false;
for (const r of results) {
  if (r.ok) {
    console.log(`  ${r.name}  (${r.bytes} bytes)`);
  } else {
    failed = true;
    console.error(
      `  ${r.name}  FAILED  HTTP ${r.status}  r2://${R2_BUCKET}/${r.key}`,
    );
  }
}

if (failed) {
  console.error(
    "Some teavm artifacts failed to download from R2. Did you run `just upload-teavm`?",
  );
  process.exit(1);
}

console.log(`Staged ${results.length} teavm artifacts into ${dist}`);
