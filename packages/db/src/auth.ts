import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { getDb } from "./client";
import { getDbEnv } from "./env";
import { userConfig } from "./schema";
import { logger } from "./log";
import { migrateProjectsOwner } from "./data/projects";

const log = logger.child({ scope: "auth" });

function createAuth() {
  const env = getDbEnv();
  return betterAuth({
    baseURL: env.DEPLOYMENT_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: "sqlite" }),
    session: {
      // Better Auth serves user+session from a signed cookie for 5 min
      // instead of reading them from D1 on every call. Our own follow-up
      // queries (user_config, admin check) still run every time, which is
      // intentional so theme changes propagate immediately.
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    plugins: [
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const linkLog = logger.child({ scope: "auth.onLinkAccount" });
          const fromId = anonymousUser.user.id;
          const toId = newUser.user.id;
          const projects = await migrateProjectsOwner(fromId, toId);
          linkLog.info(
            { fromId, toId, projects },
            "migrated anonymous user data",
          );
          // Future user-owned tables (course progress, submissions) should
          // migrate here too, keyed on anonymousUser.user.id → newUser.user.id.
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
}

let _auth: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  if (!_auth) _auth = createAuth();
  return _auth;
}
