import { test, expect } from "@playwright/test";

// End-to-end exercise of the quiz variant. Uses the seeded Hello Java
// checkpoint — one MC, one MC, one drag-to-reorder, one code-unit-test
// stub. Drag + stub auto-populate drafts on mount; both MC questions
// need a click before Submit enables.

test("quiz renders seeded questions, enables submit after answering, and persists results", async ({
  page,
}) => {
  await page.goto("/en/units/intro-to-java/hello-java/hello-java-quiz");
  await expect(
    page.getByRole("heading", { name: "Hello Java checkpoint" }),
  ).toBeVisible();

  // Four questions render.
  await expect(page.getByText(/Question 1 of 4/)).toBeVisible();
  await expect(page.getByText(/Question 4 of 4/)).toBeVisible();

  // There are two Submit buttons (header + footer); both share the same
  // enabled/disabled state driven by the quiz store.
  const submitButtons = page.getByRole("button", { name: "Submit" });
  await expect(submitButtons).toHaveCount(2);
  await expect(submitButtons.first()).toBeDisabled();

  // Answer each MC question by clicking its first choice. Two MC sections
  // means exactly two `<ol>` lists of choices; pick the first <li> of each.
  const choiceLists = page.locator("section ol");
  // First question's "A" button:
  await choiceLists.nth(0).locator("li").first().getByRole("button").click();
  // Second question's "A" button:
  await choiceLists.nth(1).locator("li").first().getByRole("button").click();

  await expect(submitButtons.first()).toBeEnabled();
  // Top-of-quiz Submit button; verifies the scroll-to-top path too.
  await submitButtons.first().click();

  await expect(page.getByText(/of 4 correct/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Retake" })).toBeVisible();

  // Reload — if any question was answered correctly, it should be
  // filtered out on the retake, leaving fewer than 4 visible.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hello Java checkpoint" }),
  ).toBeVisible();
  await expect(page.getByText(/Question 4 of 4/)).toHaveCount(0);
});
