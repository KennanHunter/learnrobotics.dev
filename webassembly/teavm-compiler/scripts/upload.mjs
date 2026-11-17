// Mirror the pinned teavm-javac artifacts from upstream (teavm.org) into
// R2. Run when TEAVM_PIN is bumped; idempotent (`putIfMissing` HEAD-checks).
import { awsFromEnvOrDevVars, putIfMissing } from "@learnrobotics/bundling";
import {
  R2_BUCKET,
  TEAVM_FILES,
  TEAVM_PIN,
  TEAVM_UPSTREAM,
  teavmKey,
} from "./config.mjs";

const aws = awsFromEnvOrDevVars();
console.log(`Uploading teavm pin "${TEAVM_PIN}" to ${R2_BUCKET}`);

let failed = false;
for (const { name, contentType } of TEAVM_FILES) {
  const upstream = `${TEAVM_UPSTREAM}/${name}`;
  const resp = await fetch(upstream);
  if (!resp.ok) {
    console.error(`  ${name}  DOWNLOAD FAILED  HTTP ${resp.status}  ${upstream}`);
    failed = true;
    continue;
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const key = teavmKey(name);
  try {
    const result = await putIfMissing({
      aws,
      bucket: R2_BUCKET,
      key,
      bytes,
      contentType,
    });
    console.log(
      `  ${name}  ${result.uploaded ? "PUT" : "SKIP"}  (${bytes.length} bytes) → r2://${R2_BUCKET}/${key}`,
    );
  } catch (err) {
    console.error(`  ${name}  FAILED  ${err.message}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Done.");
