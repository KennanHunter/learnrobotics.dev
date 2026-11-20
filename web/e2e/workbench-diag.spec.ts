import { test, expect } from "@playwright/test";

/**
 * Not a conformance test — a diagnostic harness. Loads a workbench route,
 * captures everything the browser emits (console lines, page errors,
 * network failures, security errors), waits a healthy amount of time,
 * then dumps it all so we can see where the editor actually dies.
 *
 * Run just this one in watch mode: `pnpm test:e2e workbench-diag`.
 */

const ROUTES: Array<{ label: string; url: string }> = [
  {
    label: "playground with starter",
    url: "/en/playground?s=main-hello-world",
  },
  {
    label: "code lesson",
    url: "/en/units/intro-to-learnrobotics/orientation/editor-tour",
  },
];

for (const route of ROUTES) {
  test(`diag: ${route.label}`, async ({ page }) => {
    const consoleLines: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      const loc = msg.location();
      consoleLines.push(
        `[${msg.type()}] ${msg.text()} (${loc.url}:${loc.lineNumber})`,
      );
    });
    page.on("pageerror", (err) => {
      pageErrors.push(`${err.name}: ${err.message}\n${err.stack ?? ""}`);
    });
    page.on("requestfailed", (req) => {
      failedRequests.push(
        `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "unknown"}`,
      );
    });

    await page.goto(route.url);

    // Give the workbench a generous window to mount: shell onMount + Monaco
    // loader.init() + worker bundle fetch all run async.
    await page.waitForTimeout(8000);

    const workbenchRoot = await page
      .locator('[data-testid="workbench-root"]')
      .count();
    const stillLoading = await page
      .locator('[data-testid="workbench-loading"]')
      .count();
    const runButton = await page
      .locator('[data-testid="playground-run"]')
      .count();
    const crashPane = await page
      .locator("text=Workbench crashed, text=Code lesson crashed")
      .count();

    const monacoTextarea = await page
      .locator(".monaco-editor textarea")
      .count();

    const summary = {
      url: route.url,
      workbenchRootMounted: workbenchRoot,
      stillLoadingPlaceholder: stillLoading,
      runButtonVisible: runButton,
      crashPaneVisible: crashPane,
      monacoTextareaCount: monacoTextarea,
      pageErrors: pageErrors.length,
      failedRequests: failedRequests.length,
    };

    // Print a compact block so output is scannable even in parallel runs.
    console.log(`\n==== ${route.label} ====`);
    console.log("summary:", JSON.stringify(summary, null, 2));
    if (pageErrors.length) {
      console.log("\n-- page errors --");
      for (const e of pageErrors) console.log(e);
    }
    if (failedRequests.length) {
      console.log("\n-- failed requests --");
      for (const r of failedRequests) console.log(r);
    }
    console.log("\n-- console (last 40 lines) --");
    for (const l of consoleLines.slice(-40)) console.log(l);
    console.log("\n==== end ====\n");

    // Loose assertions: we fail loud so watch mode re-runs on each edit,
    // but the point of this spec is the dump above — not the gate.
    expect(crashPane, "crash pane should not be visible").toBe(0);
    expect(workbenchRoot, "workbench-root should mount").toBeGreaterThan(0);
    expect(monacoTextarea, "Monaco textarea should mount").toBeGreaterThan(0);
  });
}
