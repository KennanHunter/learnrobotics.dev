import { createServerFn } from "@tanstack/solid-start";
import { getRequest } from "@tanstack/solid-start/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import * as v from "valibot";
import { getAuth } from "~/server/auth";
import { getDb } from "~/server/db";
import { getEnv } from "~/server/env";
import { listBucketObjects, type R2Object } from "~/server/r2";
import { account, session, user, userConfig } from "~/server/schema";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "admin" });

async function requireAdmin(): Promise<string> {
  const req = getRequest();
  const sess = await getAuth().api.getSession({ headers: req.headers });
  if (!sess) throw new Error("Unauthorized");
  const adminId = getEnv().ADMIN_GITHUB_USER_ID ?? "";
  if (!adminId) throw new Error("Forbidden");
  const rows = await getDb()
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, sess.user.id),
        eq(account.providerId, "github"),
        eq(account.accountId, adminId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("Forbidden");
  return sess.user.id;
}

export type AdminStats = {
  totalUsers: number;
  anonymousUsers: number;
  registeredUsers: number;
};

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

const ListUsersPageSchema = v.object({
  start: v.pipe(v.number(), v.integer(), v.minValue(0)),
  count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(200)),
  query: v.optional(v.pipe(v.string(), v.maxLength(200))),
});

export const listUsersPage = createServerFn({ method: "GET" })
  .validator((data: unknown) => v.parse(ListUsersPageSchema, data))
  .handler(async ({ data }): Promise<UsersPage> => {
    await requireAdmin();
    const db = getDb();
    const q = data.query?.trim();
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
      .limit(data.count)
      .offset(data.start);
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
  });

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

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

const GetUserDetailsSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
});

export const getUserDetails = createServerFn({ method: "GET" })
  .validator((data: unknown) => v.parse(GetUserDetailsSchema, data))
  .handler(async ({ data }): Promise<AdminUserDetails> => {
    await requireAdmin();
    const db = getDb();
    const [u] = await db
      .select()
      .from(user)
      .where(eq(user.id, data.userId))
      .limit(1);
    if (!u) throw new Error("Not found");
    const [cfg] = await db
      .select()
      .from(userConfig)
      .where(eq(userConfig.userId, data.userId))
      .limit(1);
    const accounts = await db
      .select({
        providerId: account.providerId,
        accountId: account.accountId,
        scope: account.scope,
        createdAt: account.createdAt,
      })
      .from(account)
      .where(eq(account.userId, data.userId));
    const [sessAgg] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${session.expiresAt} > ${sql.raw(`(strftime('%s','now'))`)} then 1 else 0 end)`,
        lastSeen: sql<number | null>`max(${session.updatedAt})`,
      })
      .from(session)
      .where(eq(session.userId, data.userId));
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
      .where(eq(session.userId, data.userId))
      .orderBy(desc(session.updatedAt))
      .limit(10);
    const toMs = (d: Date | number | null | undefined): number => {
      if (d == null) return 0;
      if (d instanceof Date) return d.getTime();
      const n = Number(d);
      return n < 1e12 ? n * 1000 : n;
    };
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
  });

const DeleteUserSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
});

export const deleteUser = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(DeleteUserSchema, data))
  .handler(async ({ data }) => {
    const adminUserId = await requireAdmin();
    if (data.userId === adminUserId) {
      log.warn({ userId: data.userId }, "deleteUser: refusing self-delete");
      throw new Error("Cannot delete yourself");
    }
    log.info({ userId: data.userId }, "deleteUser");
    await getDb().delete(user).where(eq(user.id, data.userId));
    return { ok: true as const };
  });

export const getAdminStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminStats> => {
    await requireAdmin();
    const db = getDb();
    const rows = await db
      .select({
        total: sql<number>`count(*)`,
        anon: sql<number>`sum(case when ${user.isAnonymous} then 1 else 0 end)`,
      })
      .from(user);
    const row = rows[0];
    const totalUsers = Number(row?.total ?? 0);
    const anonymousUsers = Number(row?.anon ?? 0);
    log.debug({ totalUsers, anonymousUsers }, "getAdminStats");
    return {
      totalUsers,
      anonymousUsers,
      registeredUsers: totalUsers - anonymousUsers,
    };
  },
);

// R2 bundle inventory. Each prefix below corresponds to a kind of artifact
// we host — teavm is flat-file-per-pin (legacy layout), runtime-bundle
// is single-tar-per-pin. Both live in `learn-robotics-dev-storage`.
const BUNDLE_SOURCES = [
  { label: "teavm", bucket: "learn-robotics-dev-storage", prefix: "teavm/" },
  {
    label: "runtime-bundle",
    bucket: "learn-robotics-dev-storage",
    prefix: "bundles/",
  },
] as const;

export type BundleObject = R2Object & {
  source: string;
  kind: string;
  pin: string;
  filename: string;
};

export type BundleInventory = {
  sources: {
    label: string;
    bucket: string;
    prefix: string;
    objects: BundleObject[];
    error?: string;
  }[];
};

function parseKey(
  prefix: string,
  key: string,
): { kind: string; pin: string; filename: string } {
  // Expect prefix + "<kind>/<pin>/<filename>" OR prefix + "<pin>/<filename>" (teavm).
  const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const parts = rest.split("/");
  if (parts.length >= 3) {
    return {
      kind: parts[0] ?? "",
      pin: parts[1] ?? "",
      filename: parts.slice(2).join("/"),
    };
  }
  if (parts.length === 2) {
    // Legacy teavm shape: prefix="teavm/" → rest="<pin>/<file>"
    return {
      kind: prefix.replace(/\/+$/, ""),
      pin: parts[0] ?? "",
      filename: parts[1] ?? "",
    };
  }
  return { kind: "", pin: "", filename: rest };
}

export const listBundles = createServerFn({ method: "GET" }).handler(
  async (): Promise<BundleInventory> => {
    await requireAdmin();
    const sources = await Promise.all(
      BUNDLE_SOURCES.map(async (src) => {
        try {
          const raw = await listBucketObjects({
            bucket: src.bucket,
            prefix: src.prefix,
          });
          const objects = raw.map((obj) => ({
            ...obj,
            source: src.label,
            ...parseKey(src.prefix, obj.key),
          }));
          return { ...src, objects };
        } catch (err) {
          log.warn(
            {
              source: src.label,
              err: err instanceof Error ? err.message : String(err),
            },
            "listBundles: source failed",
          );
          return {
            ...src,
            objects: [] as BundleObject[],
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
    return { sources };
  },
);
