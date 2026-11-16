// One-shot: download the current teavm-javac artifacts from
// teavm.org/playground and upload them to R2 under teavm/<TEAVM_PIN>/.
// Run this when you want to cut a new pin — bump TEAVM_PIN in config.mjs
// first, then `just upload-teavm`. After it finishes, `just build-teavm`
// (which runs stage.mjs) will pick up the new pin from R2.
import { AwsClient } from "aws4fetch";
import {
  R2_BUCKET,
  TEAVM_FILES,
  TEAVM_PIN,
  TEAVM_UPSTREAM,
  r2Endpoint,
  readR2Credentials,
  teavmObjectKey,
} from "./config.mjs";

const contentTypeFor = (name) => {
  if (name.endsWith(".wasm")) return "application/wasm";
  if (name.endsWith(".js")) return "application/javascript";
  return "application/octet-stream";
};

const creds = readR2Credentials();
const aws = new AwsClient({
  accessKeyId: creds.accessKeyId,
  secretAccessKey: creds.secretAccessKey,
  service: "s3",
  region: "auto",
});

console.log(`Uploading teavm pin "${TEAVM_PIN}" to ${R2_BUCKET}`);

let failed = false;
for (const name of TEAVM_FILES) {
  const upstreamUrl = `${TEAVM_UPSTREAM}/${name}`;
  const resp = await fetch(upstreamUrl);
  if (!resp.ok) {
    console.error(`  ${name}  DOWNLOAD FAILED  HTTP ${resp.status}  ${upstreamUrl}`);
    failed = true;
    continue;
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());

  const key = teavmObjectKey(name);
  const putUrl = `${r2Endpoint()}/${R2_BUCKET}/${key}`;
  const put = await aws.fetch(putUrl, {
    method: "PUT",
    body: bytes,
    headers: { "content-type": contentTypeFor(name) },
  });
  if (!put.ok) {
    console.error(
      `  ${name}  UPLOAD FAILED  HTTP ${put.status}  ${await put.text()}`,
    );
    failed = true;
    continue;
  }
  console.log(`  ${name}  (${bytes.length} bytes) → r2://${R2_BUCKET}/${key}`);
}

if (failed) {
  console.error("Some uploads failed.");
  process.exit(1);
}
console.log("Done.");
