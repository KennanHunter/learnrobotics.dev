import { createServerFn } from "@tanstack/solid-start";
import { getRequest } from "@tanstack/solid-start/server";
import { and, desc, eq, sql } from "drizzle-orm";
import * as v from "valibot";
import { getAuth } from "~/server/auth";
import { getDb } from "~/server/db";
import { getEnv } from "~/server/env";
import { account, user } from "~/server/schema";
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
  email: string;
  image: string | null;
  isAnonymous: boolean;
  createdAt: number;
};

export const listUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminUser[]> => {
    await requireAdmin();
    const rows = await getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isAnonymous: user.isAnonymous,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(500);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      image: r.image ?? null,
      isAnonymous: Boolean(r.isAnonymous),
      createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
    }));
  },
);

const DeleteUserSchema = v.object({ userId: v.pipe(v.string(), v.minLength(1)) });

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
