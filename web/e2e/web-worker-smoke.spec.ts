import { test, expect } from "@playwright/test";

test("web worker drives compile — phase transitions + real javac diagnostic", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/en/playground");

  const runButton = page.getByTestId("playground-run");
  await expect(runButton).toHaveAttribute("data-phase", "idle");

  // Replace editor contents with intentionally broken Java so we get a
  // deterministic javac diagnostic (not a runtime hang on ristretto).
  const editor = page.locator(".monaco-editor").first();
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.type("class Broken { void x() { int z = ; } }");

  await runButton.click();

  // Must transition to "compiling" — if the worker failed to spawn or
  // import, we'd stay "idle" or go straight to an error with no phase
  // change.
  await expect(runButton).toHaveAttribute("data-phase", "compiling", {
    timeout: 5000,
  });

  // Error panel surfaces, phase returns to idle, text contains a real
  // javac-style diagnostic token (not "worker crashed" or an import error).
  const errorPanel = page.locator("div.text-red");
  await expect(errorPanel).toBeVisible({ timeout: 90_000 });
  await expect(runButton).toHaveAttribute("data-phase", "idle");
  await expect(errorPanel).toContainText(
    /illegal start|expected|cannot find symbol|not a statement|;.*expected/i,
  );

  expect(pageErrors, "page errors: " + pageErrors.join("\n")).toEqual([]);
});
