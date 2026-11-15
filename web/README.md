# learnrobotics.dev

TanStack Start (Solid) + Cloudflare Workers + D1 + Better Auth (Drizzle adapter).

## Setup

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in BETTER_AUTH_SECRET + GitHub OAuth creds

# Create D1 database and paste the returned id into wrangler.jsonc
wrangler d1 create learnrobotics

# Generate and apply migrations
pnpm db:generate
pnpm db:migrate:local
```

### GitHub OAuth app

Create an OAuth app at <https://github.com/settings/developers>:

- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:5173/api/auth/callback/github`

Put the client id/secret in `.dev.vars`.

## Dev

```bash
pnpm dev
```

Visit <http://localhost:5173>. First visit auto-creates an anonymous session.
Clicking **Sign in with GitHub** links the anonymous account to the real one via
Better Auth's `anonymous()` plugin — see `src/server/auth.ts` `onLinkAccount`
for where to migrate user-owned data as new tables are added.

## Deploy

```bash
pnpm db:migrate               # apply migrations to remote D1
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
pnpm deploy
```

## Layout

- `src/routes/**` — file-based TanStack Router routes (SSR + streaming).
- `src/server/**` — server-only: DB, auth, env. Imported only from server fns + API routes.
- `src/lib/**` — isomorphic helpers: auth client, server-fn wrappers, i18n list.
