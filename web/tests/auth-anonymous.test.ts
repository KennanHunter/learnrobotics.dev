import { describe, it, expect } from "vitest";
import { getAuth } from "~/server/auth";

describe("anonymous auth flow", () => {
  it("signs in an anonymous user and returns a session", async () => {
    const auth = getAuth();
    const headers = new Headers();

    expect(await auth.api.getSession({ headers })).toBeNull();

    const signedIn = await auth.api.signInAnonymous({
      headers,
      returnHeaders: true,
    });
    expect(signedIn?.response?.user.isAnonymous).toBe(true);

    // Carry the session cookie forward like getSession() does via Request headers.
    const setCookie = signedIn?.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const forwarded = new Headers({ cookie: setCookie!.split(";")[0] });

    const session = await auth.api.getSession({ headers: forwarded });
    expect(session?.user.isAnonymous).toBe(true);
    expect(session?.user.id).toBe(signedIn!.response!.user.id);
  });
});
