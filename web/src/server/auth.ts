import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { getDb } from "./db";
import { getEnv } from "./env";
import { userConfig } from "./schema";

let _auth: ReturnType<typeof betterAuth> | undefined;

export function getAuth() {
  if (_auth) return _auth;
  const env = getEnv();
  _auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
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
            const now = new Date();
            await getDb()
              .insert(userConfig)
              .values({
                userId: newUser.id,
                language: "en",
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
