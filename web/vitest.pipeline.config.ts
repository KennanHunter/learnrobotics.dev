// Standalone vitest config for the Node-side playground pipeline test.
// Deliberately omits the cloudflareTest plugin (we don't need D1 / workerd
// here, and workerd can't read local files) and forces preview2-shim +
// friends to resolve to their browser variants so the test exercises the
// same import tree as web/src/workers/code-runner.worker.ts.

import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": path.join(here, "src"),
    },
    conditions: ["browser", "import", "module", "default"],
  },
  test: {
    include: ["tests/pipeline.test.ts"],
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
