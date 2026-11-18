// Fetch the pinned teavm-javac artifacts from R2 and stage them into the
// teavm-compiler package's dist, where the web app imports them from.
// Local-dev flow; CI doesn't need this.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { R2_BUCKET, TEAVM_FILES, TEAVM_PIN, teavmKey } from "../catalog.mjs";
import { teavmStageDir } from "../paths.mjs";
import { awsFromEnvOrDevVars, fetchObject } from "../r2.mjs";

export async function stageTeavm() {
  const dist = teavmStageDir();
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  const aws = awsFromEnvOrDevVars();
  console.log(`Staging teavm pin "${TEAVM_PIN}" from ${R2_BUCKET}`);

  const results = await Promise.all(
    TEAVM_FILES.map(async ({ name }) => {
      const key = teavmKey(name);
      try {
        const bytes = await fetchObject({ aws, bucket: R2_BUCKET, key });
        writeFileSync(join(dist, name), bytes);
        return { name, key, ok: true, bytes: bytes.length };
      } catch (err) {
        return { name, key, ok: false, error: err.message };
      }
    }),
  );

  let failed = false;
  for (const r of results) {
    if (r.ok) {
      console.log(`  ${r.name}  (${r.bytes} bytes)`);
    } else {
      failed = true;
      console.error(`  ${r.name}  FAILED  ${r.error}  r2://${R2_BUCKET}/${r.key}`);
    }
  }

  if (failed) {
    throw new Error(
      "stage-teavm: some artifacts missing from R2. Run `mirror-teavm` first.",
    );
  }
  console.log(`Staged ${results.length} teavm artifacts into ${dist}`);
}
