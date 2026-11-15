import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrations = await readD1Migrations(path.join(here, "drizzle"));

export default defineConfig({
  resolve: {
    alias: {
      "~": path.join(here, "src"),
    },
  },
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-01-01",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: { DB: "learnrobotics-test" },
        bindings: {
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
          BETTER_AUTH_URL: "http://localhost:5173",
          GITHUB_CLIENT_ID: "test-client-id",
          GITHUB_CLIENT_SECRET: "test-client-secret",
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
});
