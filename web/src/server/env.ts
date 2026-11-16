import { env } from "cloudflare:workers";

export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  ASSETS: Fetcher;
  BETTER_AUTH_SECRET: string;
  DEPLOYMENT_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ADMIN_GITHUB_USER_ID?: string;
  ENVIRONMENT?: "development" | "preview" | "alpha";
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
};

export function getEnv(): Bindings {
  return env as unknown as Bindings;
}
