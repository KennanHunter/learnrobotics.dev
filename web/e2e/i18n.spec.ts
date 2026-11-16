import { test, expect, type BrowserContext } from "@playwright/test";

// Client hydration is currently broken on this stack (see
// web/docs/vite-cloudflare-solid-jsx-bug.md), so we test the SSR output —
// which is what Paraglide affects and what matters for SEO. JS is disabled
// per-context below. Once hydration is fixed, drop `javaScriptEnabled: false`.
async function ssrContext(browser: BrowserContext["browser"]) {
  return browser!.newContext({ javaScriptEnabled: false });
}

test("root redirects to a localized URL", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|pirate)\/?$/);
});

test("english landing renders english strings", async ({ browser }) => {
  const ctx = await ssrContext(browser);
  const page = await ctx.newPage();
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Learn Robotics" })).toBeVisible();
  await expect(page.getByText("Courses")).toBeVisible();
  await expect(page.getByRole("link", { name: "Try the Java compiler" })).toBeVisible();
  await ctx.close();
});

test("pirate landing renders pirate strings", async ({ browser }) => {
  const ctx = await ssrContext(browser);
  const page = await ctx.newPage();
  await page.goto("/pirate");
  await expect(page.locator("html")).toHaveAttribute("lang", "pirate");
  await expect(page.getByText("Voyages")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Take th' Java compiler for a spin/ }),
  ).toBeVisible();
  await ctx.close();
});

test("internal links keep the locale prefix", async ({ browser }) => {
  const ctx = await ssrContext(browser);
  const page = await ctx.newPage();
  await page.goto("/pirate");
  await expect(
    page.getByRole("link", { name: /Take th' Java compiler for a spin/ }),
  ).toHaveAttribute("href", "/pirate/playground");
  await ctx.close();
});

test("playground renders translated chrome", async ({ browser }) => {
  const ctx = await ssrContext(browser);
  const page = await ctx.newPage();
  await page.goto("/pirate/playground");
  await expect(
    page.getByRole("heading", { name: "Riggin' Yard" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Set sail" })).toBeVisible();
  await ctx.close();
});

test("404 page uses the active locale", async ({ browser }) => {
  const ctx = await ssrContext(browser);
  const page = await ctx.newPage();
  const response = await page.goto("/pirate/definitely-not-a-route");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: /sailed off the map/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Back t' port/ })).toBeVisible();
  await ctx.close();
});
