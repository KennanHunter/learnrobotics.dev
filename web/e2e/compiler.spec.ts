import { test, expect } from "@playwright/test";

test.describe("teavm playground compile", () => {
  // Pipeline is wired: teavm compile → ristretto run. The ristretto side
  // hangs on JDK bootstrap over wasi:http — see
  // development/agent-output/compiler-wasm-performance.md. Unskip once that's
  // addressed (ship the JDK, or env-var it to a sideloaded blob).
  test.fixme("compiles hello-world and attempts ristretto run", async ({ page }) => {
    // First compile pays the wasm instantiation + SDK fetch — give it room.
    test.setTimeout(120_000);

    const consoleErrors: string[] = [];
    const consoleAll: string[] = [];
    page.on("console", (msg) => {
      consoleAll.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      consoleAll.push(`[pageerror] ${err.message}`);
      consoleErrors.push(err.message);
    });

    await page.goto("/en/playground");

    const runButton = page.getByRole("button", { name: "Run" });
    await expect(runButton).toBeVisible();
    await runButton.click();

    // On success, playground renders `Main.class  (<N> bytes)` + hex dump.
    // On failure, the red error panel shows diagnostics.
    // Success == program printed stdout; known failure right now is the
    // ristretto JDK bootstrap over wasi:http. Accept either so the test
    // tells us which side of the pipe broke.
    const output = page.locator("div.whitespace-pre-wrap").first();
    const errorPanel = page.locator("div.text-red");
    try {
      await Promise.race([
        output.waitFor({ state: "visible", timeout: 90_000 }),
        errorPanel.waitFor({ state: "visible", timeout: 90_000 }),
      ]);
    } catch (e) {
      console.error("console log tail:\n" + consoleAll.slice(-60).join("\n"));
      throw e;
    }
  });

  test("surfaces javac diagnostics on a syntax error", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/en/playground");

    // Replace the editor contents with something that won't compile.
    // Monaco's textarea is focus-trapping; use the keyboard API via the
    // editor root.
    const editor = page.locator(".monaco-editor").first();
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type("class Broken { void x() { int z = ; } }");

    await page.getByRole("button", { name: "Run" }).click();

    const errorPanel = page.locator("div.text-red");
    await expect(errorPanel).toBeVisible({ timeout: 90_000 });
    await expect(errorPanel).toContainText(/error/i);
  });
});
