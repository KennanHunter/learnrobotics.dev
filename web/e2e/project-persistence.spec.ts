import { test, expect } from "@playwright/test";

/**
 * Verifies the D1-backed project persistence slice end-to-end:
 *   1. Load the playground with a starter, let the editor mount.
 *   2. Edit the active file.
 *   3. Debounced save should create a project row and rewrite the URL to
 *      include `project=<id>`.
 *   4. Reload — anonymous session cookie should carry the identity across,
 *      the route should re-hydrate from the server row, and the edited
 *      content should still be visible in the Monaco model.
 *
 * Runs the real server fns against the local miniflare D1 that `pnpm dev`
 * boots, so a regression in validation, auth, or data-layer surfaces here.
 */
test("playground edits persist across reload via server round-trip", async ({
  page,
}) => {
  await page.goto("/en/playground?s=main-hello-world");

  // Wait for Monaco to mount (same contract as workbench-diag).
  const textarea = page.locator(".monaco-editor textarea");
  await expect(textarea).toHaveCount(1, { timeout: 15_000 });

  // Click the editor root (same pattern as compiler/web-worker-smoke specs);
  // Monaco's hidden overlays swallow clicks on the textarea itself.
  const editor = page.locator(".monaco-editor").first();
  await editor.click();

  const needle = `// persisted-edit-${Date.now()}`;
  await page.keyboard.press("End");
  await page.keyboard.type(`\n${needle}\n`);

  // Verify the keystroke reached Monaco's model.
  await expect(page.locator(".monaco-editor .view-lines")).toContainText(
    needle,
    { timeout: 5_000 },
  );

  // Debounce + server round-trip: 300ms debounce + createServerFn hop.
  // Give it a generous window to guard against local CI slowness.
  await page.waitForFunction(
    () => new URL(window.location.href).searchParams.has("project"),
    null,
    { timeout: 15_000 },
  );

  const beforeReload = new URL(page.url());
  const projectId = beforeReload.searchParams.get("project");
  expect(
    projectId,
    "URL should carry project id after first save",
  ).toBeTruthy();

  await page.reload();

  // After reload: workbench re-mounts, project loads via getUserProject,
  // seed is populated from the server row, Monaco receives it.
  const textareaAfter = page.locator(".monaco-editor textarea");
  await expect(textareaAfter).toHaveCount(1, { timeout: 15_000 });

  // Model content is exposed via the DOM view; monaco renders .view-lines.
  // We search for the needle inside the editor's rendered lines.
  const content = page.locator(".monaco-editor .view-lines");
  await expect(content).toContainText(needle, { timeout: 15_000 });
});
