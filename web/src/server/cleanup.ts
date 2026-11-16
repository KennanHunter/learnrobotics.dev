import { and, eq, lt } from "drizzle-orm";
import { getDb } from "./db";
import { getEnv } from "./env";
import { user } from "./schema";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "cleanup" });

// How long an anonymous user can sit idle before the cron deletes it.
// Dev gets a tight window so you can watch the job work; prod keeps a month
// so anons who come back the next week don't lose state.
function anonymousTtlMs(): number {
  const envName = getEnv().ENVIRONMENT;
  if (envName === "development" || envName === "preview") {
    return 60 * 60 * 1000; // 1 hour
  }
  return 30 * 24 * 60 * 60 * 1000; // 30 days
}

export async function cleanupAnonymousUsers(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - anonymousTtlMs());
  log.info({ cutoff: cutoff.toISOString() }, "cleanupAnonymousUsers: start");
  const result = await getDb()
    .delete(user)
    .where(and(eq(user.isAnonymous, true), lt(user.updatedAt, cutoff)))
    .returning({ id: user.id });
  log.info({ deleted: result.length }, "cleanupAnonymousUsers: done");
  return { deleted: result.length };
}
