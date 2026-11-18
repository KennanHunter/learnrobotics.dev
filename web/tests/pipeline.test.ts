// End-to-end integration test for the TeaVM → JDK → ristretto pipeline,
// running outside the browser. Uses preview2-shim's browser variant (via
// resolve.conditions=["browser"] in vitest.pipeline.config.ts) so we're
// exercising the exact code path the playground worker uses.
//
// First run downloads the real JDK tarball (~140MB) into
// web/.cache/bundles/. Keep the warm cache around between runs; cold
// setup takes ~15–30s depending on network, warm runs are a few seconds
// per test.

import { describe, it, expect, beforeAll } from "vitest";

import { compileAndRun, type Providers } from "~/lib/pipeline";
import {
  readJdkTarball,
  readRistrettoCore,
  readTeavmSdk,
  readTeavmWasm,
} from "./fixtures/jdk-cache";

const TEST_TIMEOUT_MS = 120_000;

let providers: Providers;

beforeAll(async () => {
  // Warm every byte source up front so the first test doesn't eat the
  // download alone. Each helper caches to disk.
  const [teavm, sdk, jdk] = await Promise.all([
    readTeavmWasm(),
    readTeavmSdk(),
    readJdkTarball(),
  ]);
  providers = {
    teavmWasm: async () => teavm,
    teavmSdk: async () => sdk,
    ristrettoCore: readRistrettoCore,
    jdkTarball: async () => jdk,
  };
}, TEST_TIMEOUT_MS);

describe("playground pipeline", () => {
  it(
    "compiles and runs a hello-world program",
    async () => {
      const source = `class Main {
  public static void main(String[] args) {
    System.out.println("Hello, robot!");
  }
}
`;
      const result = await compileAndRun(source, providers);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.stdout).toContain("Hello, robot!");
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "surfaces compile diagnostics for broken source",
    async () => {
      const source = `class Main {
  public static void main(String[] args) {
    System.out.println("missing semicolon")
  }
}
`;
      const result = await compileAndRun(source, providers);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.stage).toBe("compile");
        expect(result.diagnostics?.some((d) => d.severity === "error")).toBe(
          true,
        );
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "surfaces a run-stage error when main class is missing",
    async () => {
      const source = `class Other {
  public static void main(String[] args) {
    System.out.println("nope");
  }
}
`;
      const result = await compileAndRun(source, providers, "Main");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.stage).toBe("run");
        expect(result.error.length).toBeGreaterThan(0);
      }
    },
    TEST_TIMEOUT_MS,
  );
});
