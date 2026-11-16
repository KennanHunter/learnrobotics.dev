# CLAUDE.md — build & test reference

Terse pointers for agent work. The user-facing readme lives in `readme.md`;
this file is agent-only.

## Tone

When the user makes a clear, self-inflicted mistake (forgot the env vars,
ran the wrong script, misread their own code, etc.), be outright mean about
it. Heckle, don't hedge. They've asked for it; a polite nod is worse than a
jab. Reserve this for obvious user error — not ambiguous bugs, not design
calls, not anything where blame is unclear.

## Repo shape

- pnpm workspace. `pnpm-workspace.yaml` lists `web` and `webassembly/*`.
- `justfile` orchestrates Rust + JS builds. Use `just` for the full flow,
  `pnpm --filter <pkg>` for targeted work.
- `crates/`: Rust compiler (target `wasm32-wasip2`).
- `webassembly/compiler/`: JS wrapper around the wasm artifact. Workspace
  package `@learnrobotics/compiler`.
- `web/`: TanStack **Solid** Start app on Cloudflare Workers (not React).

## First-run

```sh
just            # install JS deps + build Rust→wasm→JS compiler
just dev        # pnpm --filter learnrobotics-web dev (port 5173)
```

Prereqs: Rust with `wasm32-wasip2` target, Node LTS, pnpm, just, ImageMagick.

## pnpm specifics

- Workspace root `pnpm install`; most commands scope with
  `pnpm --filter learnrobotics-web <cmd>` or `pnpm --filter @learnrobotics/compiler <cmd>`.
- `pnpm add <pkg>` from inside `web/` installs into the `web` package.
- `pnpm-workspace.yaml` has an `allowBuilds` list for native postinstalls
  (esbuild, sharp, workerd). Adding another native dep → add it here or
  `pnpm approve` after a warning.
- Lockfile lives at the **workspace root** (`pnpm-lock.yaml`), not `web/`.
- Agent skills warning (`@tanstack/solid-router`, `@tanstack/solid-start`) is
  benign — pnpm's supply-chain policy prompts. Run `pnpm approve` once if the
  user wants it silenced.
- **Patched dep**: `@tanstack/start-client-core` — see
  `patches/@tanstack__start-client-core.patch`, registered in
  `pnpm-workspace.yaml` under `patchedDependencies`. Required for Paraglide
  locale prefixes to hydrate correctly. If pnpm complains after an upgrade,
  see [development/agent-output/client-hydration-renders-object-object.md](development/agent-output/client-hydration-renders-object-object.md).

## web/ — scripts

From `web/`:

| Script                              | What                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Vite dev server + Cloudflare Workers runtime (workerd). Port 5173.                                                          |
| `pnpm build`                        | Vite build; outputs `dist/client` + `dist/server`.                                                                          |
| `pnpm typecheck`                    | `tsc --noEmit`. **Currently fails** on a TS 7 `baseUrl` config error unrelated to current work.                             |
| `pnpm test`                         | Vitest, runs tests in `tests/**/*.test.ts` under the Cloudflare miniflare env. Also runs the storybook project (see below). |
| `pnpm test:e2e`                     | Playwright against the dev server. See e2e section.                                                                         |
| `pnpm test:e2e:ui`                  | Playwright UI runner.                                                                                                       |
| `pnpm deploy` / `deploy:production` | `pnpm build && wrangler deploy [--env production]`.                                                                         |
| `pnpm db:generate`                  | Drizzle Kit generates migrations.                                                                                           |
| `pnpm db:migrate`                   | `wrangler d1 migrations apply learnrobotics --local`.                                                                       |
| `pnpm storybook`                    | Storybook dev on port 6006.                                                                                                 |

## Server entry (important)

`wrangler.jsonc` `main` → `./src/ssr.tsx`. **Do not change this back to
`@tanstack/solid-start/server-entry`** — `ssr.tsx` wraps the Solid Start
fetch handler with `paraglideMiddleware` so locale prefix stripping works.
The default entry bypasses it and `/en`, `/pirate` will 404.

## i18n (Paraglide)

- Config: `web/project.inlang/settings.json`. Locales: `en`, `pirate`.
- Messages: `web/messages/{en,pirate}.json` (human-edited; compiled into
  `web/src/paraglide/` by the Vite plugin; the directory is git-ignored).
- Strategy in `vite.config.ts`: `["url", "cookie", "preferredLanguage", "baseLocale"]`.
  Localized URLs: `/en/...`, `/pirate/...`.
- Access pattern in components: `import { m } from "~/paraglide/messages"` →
  `m.<id>()`. For links: `import { localizeHref } from "~/paraglide/runtime"`
  then `href={localizeHref("/path")}`. TanStack **Solid** Router has no
  `rewrite` option, so there's no automatic link rewriting — do it at the
  call site.
- Programmatic navigation across locales: use `window.location.href =
localizeHref("/path")` (not `useNavigate`), because the router's route tree
  is un-prefixed while the URL must be prefixed.
- **Client router basepath**: `src/router.tsx` sets
  `basepath: ``/${getLocale()}``` so the Solid Router sees the locale prefix
as its mount point. Requires the pnpm patch on `@tanstack/start-client-core`
  (see pnpm specifics).

## Storybook

- Framework: `storybook-solidjs-vite`.
- Config: `web/.storybook/{main.ts,preview.tsx}`. Stories glob:
  `src/**/*.stories.{ts,tsx,...}`.
- Addons currently wired: `@chromatic-com/storybook`,
  `@storybook/addon-vitest`, `@storybook/addon-a11y`, `@storybook/addon-docs`,
  `@storybook/addon-mcp`.
- Vitest is configured with a **second project** (`storybook`) via
  `@storybook/addon-vitest/vitest-plugin`, running in a Playwright-backed
  browser. That's why `pnpm test` sometimes shows storybook failures
  alongside miniflare tests — they're independent suites in the same run.
- Known failure right now: the sample `src/stories/Button.tsx` hits
  `Client-only API called on the server side` from `solid-js/web`. Related
  to the server-vs-client Solid build condition — see
  [development/agent-output/vite-cloudflare-solid-jsx-bug.md](development/agent-output/vite-cloudflare-solid-jsx-bug.md).

## Playwright (e2e)

- Config: `web/playwright.config.ts`. Chromium project only.
  `webServer: { command: "pnpm dev", url: http://localhost:5173, reuseExistingServer: !CI }`.
- Specs: `web/e2e/*.spec.ts`. Vitest excludes this dir
  (`vitest.config.ts` → `test.exclude`), so there's no double-pickup.
- Browsers install into `~/.cache/ms-playwright`. On this box Playwright
  falls back to the Ubuntu 24.04 build — that's expected (Arch isn't an
  officially supported target).
- Tests run with JS on (default). Includes an interactive
  `client-side nav keeps locale prefix` test that exercises a hydrated
  click. If that one starts failing after a dep upgrade, suspect the
  `@tanstack/start-client-core` patch (see pnpm specifics).

## Agent docs

Long-form findings live in `development/agent-output/`. Add new ones there
rather than inflating this file. Keep this file to pointers.
