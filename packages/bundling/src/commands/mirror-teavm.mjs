// Mirror pinned teavm-javac artifacts from teavm.org into R2. Idempotent
// via putIfMissing — reruns at an existing pin are HEAD-check-only.
import {
  R2_BUCKET,
  TEAVM_FILES,
  TEAVM_PIN,
  TEAVM_UPSTREAM,
  teavmKey,
} from "../catalog.mjs";
import { awsFromEnvOrDevVars, putIfMissing } from "../r2.mjs";

export async function mirrorTeavm() {
  const aws = awsFromEnvOrDevVars();
  console.log(`Mirroring teavm pin "${TEAVM_PIN}" to ${R2_BUCKET}`);

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

  if (failed) throw new Error("mirror-teavm: one or more files failed");
}
