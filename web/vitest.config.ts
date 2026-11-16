import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
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
        d1Databases: {
          DB: "learnrobotics-test",
        },
        bindings: {
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
          DEPLOYMENT_URL: "http://localhost:5173",
          GITHUB_CLIENT_ID: "test-client-id",
          GITHUB_CLIENT_SECRET: "test-client-secret",
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          setupFiles: ["./tests/setup.ts"],
          exclude: ["node_modules/**", "dist/**", "e2e/**"],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
        },
      },
    ],
  },
});
