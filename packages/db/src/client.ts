import { drizzle } from "drizzle-orm/d1";
import { getDbEnv } from "./env";
import { logger } from "./log";
import * as schema from "./schema";

const log = logger.child({ scope: "db.client" });

export function getDb() {
  const env = getDbEnv();
  if (!env.DB) {
    log.error(
      { envKeys: Object.keys(env as unknown as Record<string, unknown>) },
      "getDb: DB binding is missing from env",
    );
    throw new Error("DB binding missing (D1). Check wrangler.jsonc + .dev.vars");
  }
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
