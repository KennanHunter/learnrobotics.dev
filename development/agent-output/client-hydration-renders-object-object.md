# Known issue: client hydration renders `[object Object]`

## Symptom

In `pnpm dev` on any route, SSR produces the correct HTML (course list, headings, nav), but once the client bundle runs, the entire `<body>` is replaced with the literal string `[object Object]`:

```html
<body><!--$-->[object Object]<!--/--><!--$--><!--/--></body>
```

- `curl http://localhost:5173/en` → 7 KB of correct markup.
- Playwright with `javaScriptEnabled: false` → correct markup.
- Playwright with JS on → `document.body.innerText === "[object Object]"`.
- No `pageerror`, no `console.error`, no unhandled rejection.
- One console warning emitted by TanStack Router during the collapse:
  `Warning: Error in route match: __root__`
  (from `@tanstack/solid-router` `dist/source/Match.jsx:87`).

## Trace of the actual DOM write

Wrapping `document.createTextNode` and `Node.prototype.insertBefore` in an
`addInitScript` shows the text node that ends up in `<body>` is created by
Solid's `normalizeIncomingArray` (`solid-js/web`, bundled into
`.vite/deps/chunk-T7SG3QGM.js`):

```
at document.createTextNode
at normalizeIncomingArray                (solid-js/web chunk:1056)
at insertExpression                      (solid-js/web chunk:999)
at Object.fn                             (solid-js/web chunk:993)
at runComputation / createRenderEffect   (solid-js chunk:759/236)
at insertExpression                      (solid-js/web chunk:990)
```

`normalizeIncomingArray` (`solid-js/web`):

```js
} else {
  const value = String(item);   // ← object falls through here
  ...
  else normalized.push(document.createTextNode(value));
}
```

The `item` is an object that:

- is not `null`/`true`/`false`
- has no `.nodeType` (not a DOM node Solid created)
- is not an Array
- is not a function

…so Solid stringifies it to `[object Object]` and inserts it as a text node.
It then does `reconcileArrays` from the body's `<!--$-->…<!--/-->` SSR markers
and replaces the entire hydrated subtree with that one text node.

## What that object actually is

An object escaping into a Solid render usually means a React-style JSX element
`{type, props, key, ...}` got passed where Solid expected a Solid node. In this
repo that lines up with the prior finding in
[[vite-cloudflare-solid-jsx-bug]] — the `solid` export condition on
`@tanstack/solid-router` and `@tanstack/solid-start` makes resolution land on
their `dist/source/*.jsx` files:

```jsonc
// @tanstack/solid-router/package.json
"exports": {
  ".": {
    "solid":   { "default": "./dist/source/index.jsx" },
    "import":  { "default": "./dist/esm/index.js" }
  }
}
```

In **dev**, `vite-plugin-solid` *does* transform those `.jsx` files for the
client — fetching e.g.
`http://localhost:5173/@fs/.../solid-router/dist/source/RouterProvider.jsx`
returns Solid-compiled output that uses `_$createComponent` from
`solid-js/web`. So the straightforward "React JSX runtime leaking into Solid"
story doesn't fully explain the client failure.

What we **have** confirmed:

1. Only one copy of `solid-js` is installed (`.pnpm/solid-js@1.9.19`), so it's
   not two-copies-of-Solid context mismatch.
2. Two copies of `@tanstack/solid-router` exist in the pnpm store (`1.170.39`
   as a direct dep and `1.168.26` pulled transitively). In dev the browser
   loads `1.170.39` — verified via request URLs — but the duplicate is a
   smell worth checking next time this comes up.
3. TanStack Router's `Match.jsx` emits "Error in route match: __root__" via
   its `CatchBoundary` `onCatch`. So an error IS being caught during the
   initial client match of the root route, but it's swallowed to a warning
   (not re-thrown) and some branch of the `Match` tree ends up returning the
   caught value as children — which is what Solid is stringifying.

The most actionable suspect: the `__root__` match's client-side error path.
`__root__.beforeLoad` runs `getSession()` (a server fn). On hydration the
client reads the serialized `b: { session: {...} }` from the streamed match
manifest instead of re-running `beforeLoad`. If that deserialization fails or
the match state is shaped differently than what the `ResolvedCatchBoundary` in
`Match.jsx` expects, the catch handler may end up receiving the error object
where it expects a component result and forward it into `children`.

## Repro

```ts
// web/e2e/_repro.spec.ts (not committed)
import { test } from "@playwright/test";
test("hydration eats body", async ({ page }) => {
  await page.goto("/en");
  await page.waitForTimeout(500);
  console.log(await page.evaluate(() => document.body.innerText));
  // → "[object Object]"
});
```

With `javaScriptEnabled: false`, the same test prints the real page text.

## Impact

- Everything SSR-dependent works: locale routing, SEO-visible markup, crawlers.
- Anything client-only breaks: TopBar sign-in button `onClick`, ProfileMenu,
  settings page language picker (`setLanguage` + `setLocale`), playground run
  button, theme toggle.

## Workarounds in place

- Playwright e2e tests pin `javaScriptEnabled: false` per-context in
  `web/e2e/i18n.spec.ts`. SSR output is still the thing we care about for
  Paraglide's URL strategy and 404 locale behavior, so this is a real test —
  just a narrower one. Drop the flag once hydration is fixed.

## Not yet tried

- Reproducing on a bare TanStack Solid Start template (no Cloudflare plugin,
  no PWA, no paraglide) with the same `solid-router`/`solid-start` versions
  — would isolate whether this is a solid-router bug or a stack-interaction
  bug like [[vite-cloudflare-solid-jsx-bug]].
- Patching `@tanstack/solid-router/package.json` to drop the `"solid"`
  condition so dev also loads `dist/esm/*.js`. The prior doc noted this
  breaks SSR with `"Client-only API called on the server side"`, but that was
  before `src/ssr.tsx` was in play — worth re-testing per-environment.
- Inspecting the client match state (`$_TSR.router`) right before hydration
  to see what shape it's in vs. what `Match.jsx` expects.
- Printing `error.stack` from inside the `onCatch` in `Match.jsx` to see what
  actually throws. Requires patching the dep temporarily.

Related: [[vite-cloudflare-solid-jsx-bug]].
