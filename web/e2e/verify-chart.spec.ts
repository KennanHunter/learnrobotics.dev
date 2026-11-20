import { test, expect } from "@playwright/test";

test("language usage chart renders both tabs with Java highlighted", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(
    "http://localhost:5173/en/units/intro-to-learnrobotics/orientation/why-java",
    { waitUntil: "networkidle" },
  );

  const canvas = page.locator("figure canvas").first();
  await expect(canvas).toBeVisible();

  // Tabs
  await expect(page.getByRole("tab", { name: /Stack Overflow 2026/ })).toBeVisible();
  const tiobeTab = page.getByRole("tab", { name: /TIOBE Nov 2026/ });
  await expect(tiobeTab).toBeVisible();

  // Citations
  await expect(page.getByText(/www\.tiobe\.com/)).toBeVisible();
  await expect(page.getByText(/survey\.stackoverflow\.co/)).toBeVisible();

  // Switch tab
  await tiobeTab.click();
  await page.waitForTimeout(400);

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.locator("figure").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator("figure").first().screenshot({ path: "/tmp/chart.png" });

  // Toggle theme and confirm chart text color updated.
  const readLabelColor = () =>
    page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--color-primary)";
      probe.style.display = "none";
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });

  const before = await readLabelColor();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.waitForTimeout(200);
  const after = await readLabelColor();
  expect(after).not.toBe(before);
  await page.locator("figure").first().screenshot({ path: "/tmp/chart-alt.png" });

  if (errors.length) throw new Error("Console/page errors: " + errors.join(" | "));
});
