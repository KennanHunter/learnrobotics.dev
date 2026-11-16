import { test, expect } from "@playwright/test";

test("root redirects to a localized URL", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|pirate)\/?$/);
});

test("english landing renders english strings", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Learn Robotics" }),
  ).toBeVisible();
  await expect(page.getByText("Courses")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try the Java compiler" }),
  ).toBeVisible();
});

test("pirate landing renders pirate strings", async ({ page }) => {
  await page.goto("/pirate");
  await expect(page.locator("html")).toHaveAttribute("lang", "pirate");
  await expect(page.getByText("Voyages")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Take th' Java compiler for a spin/ }),
  ).toBeVisible();
});

test("internal links keep the locale prefix", async ({ page }) => {
  await page.goto("/pirate");
  await expect(
    page.getByRole("link", { name: /Take th' Java compiler for a spin/ }),
  ).toHaveAttribute("href", "/pirate/playground");
});

test("playground renders translated chrome", async ({ page }) => {
  await page.goto("/pirate/playground");
  await expect(
    page.getByRole("heading", { name: "Riggin' Yard" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Set sail" })).toBeVisible();
});

test("404 page uses the active locale", async ({ page }) => {
  const response = await page.goto("/pirate/definitely-not-a-route");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: /sailed off the map/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Back t' port/ })).toBeVisible();
});

test("client-side nav keeps locale prefix", async ({ page }) => {
  await page.goto("/en");
  const playgroundLink = page.getByRole("link", {
    name: "Try the Java compiler",
  });
  await playgroundLink.click();
  await expect(page).toHaveURL(/\/en\/playground\/?$/);
  await expect(page.getByRole("heading", { name: "Playground" })).toBeVisible();
});
