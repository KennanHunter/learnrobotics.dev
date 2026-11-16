import { test, expect } from "@playwright/test";

// Covers the pre-auth login UI and the GitHub OAuth kickoff. Intentionally
// does not drive the full OAuth round-trip — that would require a test
// GitHub account and flake endlessly. Instead the test asserts Better Auth
// hands us a github.com authorize URL, which proves the server-side wiring
// (clientId, baseURL / trustedOrigins, provider config) is intact.

test("anonymous user sees the GitHub sign-in button and info tooltip", async ({
  page,
}) => {
  await page.goto("/en");
  const signIn = page.getByRole("button", { name: "Sign in with GitHub" });
  await expect(signIn).toBeVisible();
  // Tooltip is only visible on hover/focus; assert the text is in the DOM
  // and reveals when the info button receives focus (keyboard reachable).
  await page.getByRole("button", { name: "Account info" }).focus();
  await expect(
    page.getByText(/All data is saved in your browser by default/),
  ).toBeVisible();
});

test("sign-in POST returns a github.com authorize URL", async ({ request }) => {
  // Hit Better Auth directly via APIRequestContext — a browser-driven click
  // triggers a navigation that invalidates the response body, so inspecting
  // JSON from the UI path is racy. The server endpoint is what we care
  // about anyway: it proves client_id + redirect_uri + trustedOrigins are
  // wired right.
  const res = await request.post(
    "http://localhost:5173/api/auth/sign-in/social",
    {
      data: { provider: "github", callbackURL: "/" },
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
    },
  );
  expect(res.ok(), `sign-in POST failed: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { url?: string };
  expect(body.url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
  const authorize = new URL(body.url!);
  expect(authorize.searchParams.get("client_id")).toBeTruthy();
  expect(authorize.searchParams.get("redirect_uri") ?? "").toContain(
    "localhost:5173",
  );
});

test("anonymous user does not see profile menu or admin link", async ({
  page,
}) => {
  await page.goto("/en");
  await expect(
    page.getByRole("button", { name: /Settings|Admin|Logout/ }),
  ).toHaveCount(0);
});
