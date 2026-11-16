import { createServerFn } from "@tanstack/solid-start";
import {
  getRequest,
  setResponseHeader,
} from "@tanstack/solid-start/server";
import * as v from "valibot";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "~/server/auth";
import { getDb } from "~/server/db";
import { getEnv } from "~/server/env";
import { account, userConfig } from "~/server/schema";
import { THEME_IDS } from "~/lib/monaco-themes";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "session" });

export type Theme = "light" | "dark";

export type SessionSummary = {
  userId: string;
  name: string;
  image: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
  theme: Theme | null;
  monacoTheme: string | null;
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
    log.debug(
      { userId: existing.user.id, isAnonymous: existing.user.isAnonymous },
      "requireUser: existing session",
    );
    return {
      id: existing.user.id,
      name: existing.user.name,
      image: existing.user.image ?? null,
      isAnonymous: Boolean(existing.user.isAnonymous),
    };
  }
  log.info("requireUser: no session, creating anonymous user");
  // Better Auth stages Set-Cookie on its internal response headers. We need to
  // forward those to the outer HTTP response or the browser never gets the
  // session cookie and every subsequent request would create another new
  // anonymous user.
  const created = await auth.api.signInAnonymous({
    headers: req.headers,
    returnHeaders: true,
  });
  if (!created || !created.response)
    throw new Error("Failed to sign in anonymously");
  forwardSetCookies(created.headers);
  return {
    id: created.response.user.id,
    name: created.response.user.name,
    image: created.response.user.image ?? null,
    isAnonymous: true,
  };
}

function forwardSetCookies(headers: Headers | undefined) {
  if (!headers) return;
  const cookies: string[] = [];
  // Headers.getSetCookie() returns all Set-Cookie values; the older `get`
  // concatenates them with commas which breaks parsing.
  const getter = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  if (typeof getter === "function") {
    cookies.push(...getter.call(headers));
  } else {
    headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") cookies.push(value);
    });
  }
  if (cookies.length === 0) return;
  log.debug({ count: cookies.length }, "forwarding Set-Cookie headers");
  setResponseHeader("set-cookie", cookies);
}

export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionSummary> => {
    const user = await requireUser();
    const summary = await summarize(user);
    log.debug({ summary }, "getSession returning");
    return summary;
  },
);

async function summarize(user: AuthUser): Promise<SessionSummary> {
  // One D1 round-trip: read user_config and simultaneously LEFT JOIN against
  // the user's GitHub account row, filtered to the admin ID from env.
  // `adminAccountId` is non-null iff this user is the admin. If
  // ADMIN_GITHUB_USER_ID is unset, force the join to miss. Anonymous users
  // can't match either way, but we still fetch their config.
  const adminId = user.isAnonymous ? "" : getEnv().ADMIN_GITHUB_USER_ID ?? "";
  const rows = await getDb()
    .select({
      theme: userConfig.theme,
      monacoTheme: userConfig.monacoTheme,
      adminAccountId: account.id,
    })
    .from(userConfig)
    .leftJoin(
      account,
      and(
        eq(account.userId, userConfig.userId),
        eq(account.providerId, "github"),
        adminId ? eq(account.accountId, adminId) : sql`0`,
      ),
    )
    .where(eq(userConfig.userId, user.id));
  const row = rows[0];
  const theme: Theme | null =
    row?.theme === "light" || row?.theme === "dark" ? row.theme : null;
  const monacoTheme =
    row?.monacoTheme && THEME_IDS.includes(row.monacoTheme)
      ? row.monacoTheme
      : null;
  const isAdmin = Boolean(row?.adminAccountId);
  return {
    userId: user.id,
    name: user.name,
    image: user.image,
    isAnonymous: user.isAnonymous,
    isAdmin,
    theme,
    monacoTheme,
  };
}

const SetThemeSchema = v.object({
  theme: v.nullable(v.picklist(["light", "dark"])),
});

export const setTheme = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetThemeSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    log.info(
      { userId: user.id, theme: data.theme },
      "setTheme: persisting app theme",
    );
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
    log.debug({ userId: user.id, theme: data.theme }, "setTheme: committed");
    return { theme: data.theme };
  });

const SetMonacoThemeSchema = v.object({
  monacoTheme: v.nullable(v.picklist(THEME_IDS as [string, ...string[]])),
});

export const setMonacoTheme = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SetMonacoThemeSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    log.info(
      { userId: user.id, monacoTheme: data.monacoTheme },
      "setMonacoTheme: persisting editor theme",
    );
    const db = getDb();
    const now = new Date();
    await db
      .insert(userConfig)
      .values({
        userId: user.id,
        monacoTheme: data.monacoTheme,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userConfig.userId,
        set: { monacoTheme: data.monacoTheme, updatedAt: now },
      });
    log.debug(
      { userId: user.id, monacoTheme: data.monacoTheme },
      "setMonacoTheme: committed",
    );
    return { monacoTheme: data.monacoTheme };
  });
