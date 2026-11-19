import { defineConfig, devices } from "@playwright/test";

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `pnpm dev` pipes vite through pino-pretty, which hides vite's startup
    // output in CI (non-TTY stdout) and makes the webServer wait look like
    // a hang. Use plain vite under CI so failures are visible.
    command: process.env.CI ? "pnpm dev:plain" : "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
