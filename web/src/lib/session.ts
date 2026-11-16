import { createServerFn } from "@tanstack/solid-start";
import { getRequest } from "@tanstack/solid-start/server";
import * as v from "valibot";
import { eq } from "drizzle-orm";
import { getAuth } from "~/server/auth";
import { getDb } from "~/server/db";
import { userConfig } from "~/server/schema";
import { isLanguageCode, LANGUAGE_CODES } from "~/i18n";

export type Theme = "light" | "dark";

export type SessionSummary = {
  userId: string;
  name: string;
  image: string | null;
  isAnonymous: boolean;
  language: string;
  theme: Theme | null;
} | null;

type AuthUser = {
  id: string;
  name: string;
  image: string | null;
  isAnonymous: boolean;
};

async function requireUser(): Promise<AuthUser> {
  const req = getRequest();
  const auth = getAuth();
  const existing = await auth.api.getSession({ headers: req.headers });
  if (existing) {
    return {
      id: existing.user.id,
      name: existing.user.name,
      image: existing.user.image ?? null,
      isAnonymous: Boolean(existing.user.isAnonymous),
    };
  }
  // `signInAnonymous` sets cookies on Better Auth's response context (which
  // TanStack Start forwards to the HTTP response), and returns the new user
  // directly — the request headers we passed in are NOT mutated, so we must
  // use this return value rather than re-running `getSession`.
  const created = await auth.api.signInAnonymous({ headers: req.headers });
  if (!created) throw new Error("Failed to sign in anonymously");
  return {
    id: created.user.id,
    name: created.user.name,
    image: created.user.image ?? null,
    isAnonymous: true,
  };
}

export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionSummary> => {
    const user = await requireUser();
    return summarize(user);
  },
);

async function summarize(user: AuthUser): Promise<SessionSummary> {
  const cfg = await getDb().query.userConfig.findFirst({
    where: eq(userConfig.userId, user.id),
  });
  const theme: Theme | null =
    cfg?.theme === "light" || cfg?.theme === "dark" ? cfg.theme : null;
  return {
    userId: user.id,
    name: user.name,
    image: user.image,
    isAnonymous: user.isAnonymous,
    language: cfg?.language ?? "en",
    theme,
  };
}

const SetLanguageSchema = v.object({
  language: v.picklist(LANGUAGE_CODES),
});

export const setLanguage = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetLanguageSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();
    const lang = isLanguageCode(data.language) ? data.language : "en";
    const now = new Date();
    await db
      .insert(userConfig)
      .values({ userId: user.id, language: lang, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: userConfig.userId,
        set: { language: lang, updatedAt: now },
      });
    return { language: lang };
  });

const SetThemeSchema = v.object({
  theme: v.nullable(v.picklist(["light", "dark"])),
});

export const setTheme = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetThemeSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();
    const now = new Date();
    await db
      .insert(userConfig)
      .values({
        userId: user.id,
        theme: data.theme,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userConfig.userId,
        set: { theme: data.theme, updatedAt: now },
      });
    return { theme: data.theme };
  });
