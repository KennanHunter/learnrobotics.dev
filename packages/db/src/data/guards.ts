import { getRequest } from "@tanstack/solid-start/server";
import { and, eq } from "drizzle-orm";
import { getAuth } from "../auth";
import { getDb } from "../client";
import { getDbEnv } from "../env";
import { account } from "../schema";

export async function requireAdmin(): Promise<string> {
  const req = getRequest();
  const sess = await getAuth().api.getSession({ headers: req.headers });
  if (!sess) throw new Error("Unauthorized");
  const adminId = getDbEnv().ADMIN_GITHUB_USER_ID ?? "";
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
