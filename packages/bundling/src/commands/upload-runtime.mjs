// Push built runtime bundles to R2. Idempotent: putIfMissing HEAD-checks
// each (kind, pin) so reruns are cheap.
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import {
  R2_BUCKET,
  RUNTIME_BUNDLES,
  runtimeBundleKey,
} from "../catalog.mjs";
import { bundleDistPath } from "../paths.mjs";
import { awsFromEnvOrDevVars, putIfMissing } from "../r2.mjs";

export async function uploadRuntime() {
  const aws = awsFromEnvOrDevVars();
  let failed = false;

  for (const { kind, pin } of RUNTIME_BUNDLES) {
    const local = bundleDistPath(kind, pin);
    let stat;
    try {
      stat = statSync(local);
    } catch {
      console.log(
        `  ${kind}/${pin}  SKIP  (no local bundle — run build-${kind} first)`,
      );
      continue;
    }

    const bytes = readFileSync(local);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const key = runtimeBundleKey(kind, pin);
    try {
      const result = await putIfMissing({
        aws,
        bucket: R2_BUCKET,
        key,
        bytes,
        contentType: "application/gzip",
        sha256,
      });
      if (result.uploaded) {
        console.log(
          `  ${kind}/${pin}  PUT  (${(stat.size / 1024 / 1024).toFixed(1)} MB, sha256=${sha256.slice(0, 12)}…) → r2://${R2_BUCKET}/${key}`,
        );
      } else {
        console.log(
          `  ${kind}/${pin}  SKIP  (already at r2://${R2_BUCKET}/${key})`,
        );
      }
    } catch (err) {
      console.error(`  ${kind}/${pin}  FAILED  ${err.message}`);
      failed = true;
    }
  }

  if (failed) throw new Error("upload-runtime: one or more uploads failed");
}
