# Fixed: client hydration rendered `[object Object]`

> Kept as a reference because the diagnosis took work and the fix is
> non-obvious. The bug is no longer present.

## Symptom

SSR produced the correct HTML, but on client hydration the entire `<body>`
collapsed to the literal text `[object Object]`. No `pageerror`,
no `console.error`, just one warning:

    Warning: Error in route match: __root__

## Root cause

A hydration mismatch — not a component error.

1. `paraglideMiddleware` in `src/ssr.tsx` strips the locale prefix
   (`/en`, `/pirate`) from the request URL before TanStack Solid Start's
   handler sees it. The server router therefore matched the
   **delocalized** URL (`/en` → `/`), rendered the index route, and streamed
   that HTML.
2. On the client, `window.location.pathname` is still `/en`. TanStack Solid
   Router has no `rewrite` option (that's a React-router feature), and its
   route tree has `/`, `/playground`, etc. — not `/en/...`. So the client
   router treated `/en` as unmatched and resolved the match to the root's
   `notFoundComponent` (our `<ErrorPage code="404" …/>`).
3. Solid-js then tried to hydrate `<ErrorPage>` against the DOM the server
   had rendered for the index route. The hydration-key lookup failed:

       Error: Hydration Mismatch. Unable to find DOM nodes for hydration key: …
       <main>…<a …>…<h1 …>…
         at ErrorPage (…/components/ErrorPage/ErrorPage.tsx:17)

4. TanStack's `Match.jsx` caught the error in its `CatchBoundary` and
   emitted the warning — but with two overlapping error boundaries
   (`CatchBoundary` + `CatchNotFound`) and a non-rethrowing `onCatch`, the
   caught error object leaked into a Solid render slot as `children`.
   Solid's `normalizeIncomingArray` fell through to `String(item)` →
   `"[object Object]"` and inserted that text at `<body>`.

Dropping the `notFoundComponent` changed the stringified object into an
empty body (confirming that path). Adding `onCatch` to `createRootRoute` and
dumping `err.stack` surfaced the "Hydration Mismatch" message that pointed
at `ErrorPage.tsx` and sealed the diagnosis.

## Fix

Two coordinated changes so client and server agree on which route the URL
resolves to:

1. **`src/router.tsx`** — set `basepath: ``/${getLocale()}``` on
`createTanStackRouter`. On the client this makes the router treat the
locale prefix as the mount point, mapping `/en/foo`→`/foo`(and`/en`→`/`) when walking the route tree.
2. **pnpm patch `@tanstack/start-client-core`** —
   `patches/@tanstack__start-client-core.patch` removes the forced
   `router.update({ basepath: process.env.TSS_ROUTER_BASEPATH })` inside
   `hydrateStart`. Without the patch, that call wipes the basepath we
   just set back to `"/"`. Registered in `pnpm-workspace.yaml` under
   `patchedDependencies`.

The server leaves `basepath` as `/` — `createStartHandler` sets it to
`TSS_ROUTER_BASEPATH` (default `/`) at request time, which lines up with
the already-delocalized URL paraglide hands it.

No change to `paraglideMiddleware` wiring in `ssr.tsx`: it still uses the
delocalized request (`({ request }) => startHandler(request, opts)`).

## Verification

- `pnpm test:e2e` passes 7/7 with JS on (no more `javaScriptEnabled: false`).
- Added `client-side nav keeps locale prefix` to `web/e2e/i18n.spec.ts`:
  clicks a localized link and asserts the hydrated page navigates
  client-side without dropping the locale.
- `document.body.innerText` on `/en` is now the real landing page text.

## When upgrading TanStack Start

The patch targets `@tanstack/start-client-core@1.170.35`'s
`dist/esm/client/hydrateStart.js`. If pnpm complains the patch no longer
applies on an upgrade:

- Check whether upstream now accepts a `basepath` override in
  `getRouter()` (track https://github.com/TanStack/router for a fix/option).
- If not, re-create the patch: `pnpm patch @tanstack/start-client-core`,
  comment out the `basepath: process.env.TSS_ROUTER_BASEPATH` line in the
  emitted `router.update` call, `pnpm patch-commit <path>`.

Related: [[vite-cloudflare-solid-jsx-bug]] — unrelated bug in the same
dep stack, kept for context.
