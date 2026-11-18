import { env } from "cloudflare:workers";

export type DbBindings = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  DEPLOYMENT_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ADMIN_GITHUB_USER_ID?: string;
};

export function getDbEnv(): DbBindings {
  return env as unknown as DbBindings;
}
