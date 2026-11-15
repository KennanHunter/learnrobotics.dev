import { env } from "cloudflare:workers";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
};

export function getEnv(): Bindings {
  return env as unknown as Bindings;
}
