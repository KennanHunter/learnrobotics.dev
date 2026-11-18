import { sql } from "drizzle-orm";
import { getDb } from "../client";
import { user } from "../schema";

export type AdminStats = {
  totalUsers: number;
  anonymousUsers: number;
  registeredUsers: number;
};

export async function readAdminStats(): Promise<AdminStats> {
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
  return {
    totalUsers,
    anonymousUsers,
    registeredUsers: totalUsers - anonymousUsers,
  };
}
