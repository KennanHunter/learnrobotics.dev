import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { getDb } from "./db";
import { getEnv } from "./env";
import { userConfig } from "./schema";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "auth" });

let _auth: ReturnType<typeof betterAuth> | undefined;

export function getAuth() {
  if (_auth) return _auth;
  const env = getEnv();
  _auth = betterAuth({
    baseURL: env.DEPLOYMENT_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: "sqlite" }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    plugins: [
      anonymous({
        onLinkAccount: async () => {
          // No user-owned data to migrate yet. When courses add progress rows,
          // move them here from anonymousUser.id → newUser.id.
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (newUser) => {
            log.info(
              { userId: newUser.id },
              "user.create hook: seeding user_config",
            );
            const now = new Date();
            await getDb()
              .insert(userConfig)
              .values({
                userId: newUser.id,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
  return _auth;
}
