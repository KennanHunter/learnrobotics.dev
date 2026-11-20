import { getRequest, setResponseHeader } from "@tanstack/solid-start/server";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "../auth";
import { getDb } from "../client";
import { getDbEnv } from "../env";
import { logger } from "../log";
import { account, userConfig } from "../schema";

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
  systemPrompt: string | null;
  codeSystemPrompt: string | null;
  tabSize: number | null;
} | null;

type AuthUser = {
  id: string;
  name: string;
  image: string | null;
  isAnonymous: boolean;
};

export async function requireUser(): Promise<AuthUser> {
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

export async function summarizeSession(
  user: AuthUser,
): Promise<SessionSummary> {
  // One D1 round-trip: read user_config and simultaneously LEFT JOIN against
  // the user's GitHub account row, filtered to the admin ID from env.
  // `adminAccountId` is non-null iff this user is the admin. If
  // ADMIN_GITHUB_USER_ID is unset, force the join to miss. Anonymous users
  // can't match either way, but we still fetch their config.
  const adminId = user.isAnonymous
    ? ""
    : (getDbEnv().ADMIN_GITHUB_USER_ID ?? "");
  const rows = await getDb()
    .select({
      theme: userConfig.theme,
      monacoTheme: userConfig.monacoTheme,
      systemPrompt: userConfig.systemPrompt,
      codeSystemPrompt: userConfig.codeSystemPrompt,
      tabSize: userConfig.tabSize,
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
  const monacoTheme = row?.monacoTheme ?? null;
  const systemPrompt = row?.systemPrompt ?? null;
  const codeSystemPrompt = row?.codeSystemPrompt ?? null;
  const tabSize =
    typeof row?.tabSize === "number" && Number.isInteger(row.tabSize)
      ? row.tabSize
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
    systemPrompt,
    codeSystemPrompt,
    tabSize,
  };
}

export async function writeTheme(userId: string, theme: Theme | null) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(userConfig)
    .values({
      userId,
      theme,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userConfig.userId,
      set: { theme, updatedAt: now },
    });
}

export async function writeMonacoTheme(
  userId: string,
  monacoTheme: string | null,
) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(userConfig)
    .values({
      userId,
      monacoTheme,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userConfig.userId,
      set: { monacoTheme, updatedAt: now },
    });
}

export async function writeSystemPrompt(
  userId: string,
  systemPrompt: string | null,
) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(userConfig)
    .values({
      userId,
      systemPrompt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userConfig.userId,
      set: { systemPrompt, updatedAt: now },
    });
}

export async function writeTabSize(userId: string, tabSize: number | null) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(userConfig)
    .values({
      userId,
      tabSize,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userConfig.userId,
      set: { tabSize, updatedAt: now },
    });
}

export async function writeCodeSystemPrompt(
  userId: string,
  codeSystemPrompt: string | null,
) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(userConfig)
    .values({
      userId,
      codeSystemPrompt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userConfig.userId,
      set: { codeSystemPrompt, updatedAt: now },
    });
}
