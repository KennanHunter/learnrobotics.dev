import { createServerFn } from "@tanstack/solid-start";
import { getRequest } from "@tanstack/solid-start/server";
import * as v from "valibot";
import { eq } from "drizzle-orm";
import { getAuth } from "~/server/auth";
import { getDb } from "~/server/db";
import { userConfig } from "~/server/schema";
import { isLanguageCode, LANGUAGE_CODES } from "./languages";

export type Theme = "light" | "dark";

export type SessionSummary = {
  userId: string;
  name: string;
  isAnonymous: boolean;
  language: string;
  theme: Theme | null;
} | null;

export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionSummary> => {
    const req = getRequest();
    const auth = getAuth();
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      // Issue an anonymous session. The client handles the response cookies
      // when this fn is invoked from a route loader during SSR.
      await auth.api.signInAnonymous({ headers: req.headers });
      session = await auth.api.getSession({ headers: req.headers });
      if (!session) return null;
    }
    return summarize(session.user.id, session.user.name, Boolean(session.user.isAnonymous));
  },
);

async function summarize(
  userId: string,
  name: string,
  isAnonymous: boolean,
): Promise<SessionSummary> {
  const cfg = await getDb().query.userConfig.findFirst({
    where: eq(userConfig.userId, userId),
  });
  const theme: Theme | null =
    cfg?.theme === "light" || cfg?.theme === "dark" ? cfg.theme : null;
  return {
    userId,
    name,
    isAnonymous,
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
    const req = getRequest();
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) throw new Error("No session");
    const db = getDb();
    const lang = isLanguageCode(data.language) ? data.language : "en";
    const now = new Date();
    await db
      .insert(userConfig)
      .values({ userId: session.user.id, language: lang, createdAt: now, updatedAt: now })
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
    const req = getRequest();
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) throw new Error("No session");
    const db = getDb();
    const now = new Date();
    await db
      .insert(userConfig)
      .values({
        userId: session.user.id,
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
