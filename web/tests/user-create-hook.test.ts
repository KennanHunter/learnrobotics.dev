import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { getAuth } from "~/server/auth";
import { getDb } from "~/server/db";
import { userConfig } from "~/server/schema";

describe("user create hook", () => {
  it("inserts a user_config row with language='en' on user creation", async () => {
    const auth = getAuth();
    const result = await auth.api.signInAnonymous({ headers: new Headers() });
    const userId = result?.user.id;
    expect(userId).toBeDefined();

    const cfg = await getDb().query.userConfig.findFirst({
      where: eq(userConfig.userId, userId!),
    });
    expect(cfg).toBeDefined();
    expect(cfg?.language).toBe("en");
    expect(cfg?.theme).toBeNull();
  });
});
