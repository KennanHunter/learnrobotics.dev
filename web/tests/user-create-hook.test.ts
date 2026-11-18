import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { getAuth, getDb, userConfig } from "@learnrobotics/db/server";

describe("user create hook", () => {
  it("inserts a user_config row with null theme and monaco_theme on user creation", async () => {
    const auth = getAuth();
    const result = await auth.api.signInAnonymous({ headers: new Headers() });
    const userId = result?.user.id;
    expect(userId).toBeDefined();

    const cfg = await getDb().query.userConfig.findFirst({
      where: eq(userConfig.userId, userId!),
    });
    expect(cfg).toBeDefined();
    expect(cfg?.theme).toBeNull();
    expect(cfg?.monacoTheme).toBeNull();
  });
});
