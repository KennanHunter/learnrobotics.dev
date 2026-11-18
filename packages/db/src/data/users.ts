import { desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../client";
import { account, session, user, userConfig } from "../schema";

export type AdminUser = {
  id: string;
  name: string;
  // null for anonymous users — Better Auth generates a placeholder email to
  // satisfy its NOT NULL constraint, but it isn't a real address so we strip
  // it at the API boundary.
  email: string | null;
  image: string | null;
  isAnonymous: boolean;
  createdAt: number;
};

export type UsersPage = { rows: AdminUser[]; total: number };

export type AdminUserDetails = {
  id: string;
  name: string;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  isAnonymous: boolean;
  createdAt: number;
  updatedAt: number;
  config: {
    theme: string | null;
    monacoTheme: string | null;
  } | null;
  accounts: {
    providerId: string;
    accountId: string;
    scope: string | null;
    createdAt: number;
  }[];
  sessions: {
    total: number;
    active: number;
    lastSeen: number | null;
    recent: {
      id: string;
      createdAt: number;
      updatedAt: number;
      expiresAt: number;
      ipAddress: string | null;
      userAgent: string | null;
    }[];
  };
};

export type ListUsersParams = {
  start: number;
  count: number;
  query?: string | undefined;
};

export async function listUsers(params: ListUsersParams): Promise<UsersPage> {
  const db = getDb();
  const q = params.query?.trim();
  // SQLite LIKE is case-insensitive for ASCII by default. Escape wildcards
  // so user-entered % / _ don't act as pattern chars.
  const where = q
    ? or(
        like(user.name, `%${escapeLike(q)}%`),
        like(user.email, `%${escapeLike(q)}%`),
        like(user.id, `%${escapeLike(q)}%`),
      )
    : undefined;
  const countQ = db.select({ total: sql<number>`count(*)` }).from(user);
  const [countRow] = where ? await countQ.where(where) : await countQ;
  const baseQ = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      isAnonymous: user.isAnonymous,
      createdAt: user.createdAt,
    })
    .from(user);
  const rows = await (where ? baseQ.where(where) : baseQ)
    .orderBy(desc(user.createdAt))
    .limit(params.count)
    .offset(params.start);
  return {
    total: Number(countRow?.total ?? 0),
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.isAnonymous ? null : r.email,
      image: r.image ?? null,
      isAnonymous: Boolean(r.isAnonymous),
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.getTime()
          : Number(r.createdAt),
    })),
  };
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function toMs(d: Date | number | null | undefined): number {
  if (d == null) return 0;
  if (d instanceof Date) return d.getTime();
  const n = Number(d);
  return n < 1e12 ? n * 1000 : n;
}

export async function readUserDetails(userId: string): Promise<AdminUserDetails> {
  const db = getDb();
  const [u] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u) throw new Error("Not found");
  const [cfg] = await db
    .select()
    .from(userConfig)
    .where(eq(userConfig.userId, userId))
    .limit(1);
  const accounts = await db
    .select({
      providerId: account.providerId,
      accountId: account.accountId,
      scope: account.scope,
      createdAt: account.createdAt,
    })
    .from(account)
    .where(eq(account.userId, userId));
  const [sessAgg] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${session.expiresAt} > ${sql.raw(`(strftime('%s','now'))`)} then 1 else 0 end)`,
      lastSeen: sql<number | null>`max(${session.updatedAt})`,
    })
    .from(session)
    .where(eq(session.userId, userId));
  const recent = await db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.updatedAt))
    .limit(10);
  return {
    id: u.id,
    name: u.name,
    email: u.isAnonymous ? null : u.email,
    emailVerified: Boolean(u.emailVerified),
    image: u.image ?? null,
    isAnonymous: Boolean(u.isAnonymous),
    createdAt: toMs(u.createdAt),
    updatedAt: toMs(u.updatedAt),
    config: cfg
      ? {
          theme: cfg.theme ?? null,
          monacoTheme: cfg.monacoTheme ?? null,
        }
      : null,
    accounts: accounts.map((a) => ({
      providerId: a.providerId,
      accountId: a.accountId,
      scope: a.scope ?? null,
      createdAt: toMs(a.createdAt),
    })),
    sessions: {
      total: Number(sessAgg?.total ?? 0),
      active: Number(sessAgg?.active ?? 0),
      lastSeen: sessAgg?.lastSeen != null ? toMs(sessAgg.lastSeen) : null,
      recent: recent.map((s) => ({
        id: s.id,
        createdAt: toMs(s.createdAt),
        updatedAt: toMs(s.updatedAt),
        expiresAt: toMs(s.expiresAt),
        ipAddress: s.ipAddress ?? null,
        userAgent: s.userAgent ?? null,
      })),
    },
  };
}

export async function removeUser(userId: string): Promise<void> {
  await getDb().delete(user).where(eq(user.id, userId));
}
