# Code cleanliness & structure audit — 2026-11-18

Scope: `web/src/` (excluding anything under the workbench/code-editor —
editor is in flux), `content/lib/`, and top-level repo organization.

I only wrote up things I verified by reading the files. A couple of
earlier observations from a sub-agent didn't survive verification
(see "Discarded claims" at the end).

---

## Structural

### The `lib/` vs `server/` naming is fuzzy

`web/src/lib/` currently holds a mix: runtime utilities (`runtime.ts`,
`teavm.ts`, `monaco-themes.ts`), SolidJS contexts (`session-context.tsx`,
`theme-context.tsx`, `environment-context.tsx`), the `bundles/` subtree,
`logger.ts`, `content.ts`, `use-localized-navigate.ts`, plus the
BetterAuth _client_ (`auth-client.ts`).

`web/src/server/` holds the BetterAuth _server_ config, DB schema,
admin queries, R2, cleanup, env.

Having `auth-client.ts` in `lib/` while `auth.ts` sits in `server/` is
fine once you know the convention, but the folder name `lib/` doesn't
telegraph "client/runtime-only." Two options worth considering:

1. Rename `web/src/lib/` → `web/src/runtime/` (or `web/src/client/`).
   The name declares the boundary.
2. Keep `lib/` but add a one-line note at the top of `web/src/lib/`
   (e.g. a short `readme.md` or a `CLAUDE.md` pointer) saying "runtime
   / client-safe only — anything that touches D1, R2, or BetterAuth
   server config goes in `server/`."

Not urgent. Low pain today, higher pain as the surface grows.

### `web/src/workers/` — singleton folder, OK for now

Only `code-runner.worker.ts` lives there. This is the Vite convention
for worker modules, so the plural folder is defensible as scaffolding
for future workers. No action needed; just flagging so it doesn't get
"cleaned up" by mistake.

### Content authoring surface is well-separated

`content/lib/` (authoring API — `define.ts`, `types.ts`,
`index-builder.ts`, `components/`) and `web/src/lib/content.ts`
(consumption wrapper) have a clear boundary. The build-time index is
the seam. Good.

The `content/starters/` layout (one folder per starter with
`Main.java` + `starter.ts`) is clean and extends obviously. No notes.

---

## Duplication worth fixing

### `Logo` and `LogoSquare` are the same component with two render bodies

`web/src/components/Logo/Logo.tsx` and
`web/src/components/LogoSquare/LogoSquare.tsx` share:

- Identical prop type shape (`class?`, `opaque?`).
- Identical `opaque` wrapper logic (`bg-background rounded-lg p-2 …`).
- Identical internal `svg()` helper indirection.

They only differ in `viewBox`, `font-weight`, `font-size`, and the
text content inside `<text>`.

Suggested consolidation — one `Logo` component with a `variant` prop
(`"wide" | "square"`), the SVG bodies as two inline JSX branches,
shared `opaque` wrapper computed once. Either collapse to one folder,
or keep both folders and have `LogoSquare.tsx` be a one-liner that
re-exports `<Logo variant="square" />`.

Impact: ~30 lines gone, one place to change styling. Low risk — both
components are leaf/static.

### Admin panel shells share a layout skeleton

`web/src/components/admin/Stats/Stats.tsx` and
`web/src/components/admin/Bundles/Bundles.tsx` both wrap their content
in the same shell:

- Outer `flex h-full` container.
- Header with `border-b px-6 py-4`.
- `flex-1 overflow-auto` content region.
- `Switch`/`Match` over loading / error / success states around a
  resource.

An `AdminPanel` layout component accepting `title`, `children`, and
either a `resource` prop or explicit loading/error/data slots would
remove the repetition and set the shape for the next admin panel
(there will be a next one).

Not urgent — the duplication is small and readable today — but worth
doing before adding panel #4.

### `formatBytes` is a candidate for extraction

`web/src/components/admin/Bundles/Bundles.tsx` defines `formatBytes`
locally. It's the kind of helper that invariably gets re-implemented
next time someone needs it. Move to `web/src/lib/format.ts` (new
file) when a second caller shows up — don't preemptively move it.

---

## Minor inconsistencies

### Component folders: some have `index.ts`, most don't

Most component folders expose `Component.tsx` and consumers import the
named export directly. A few (e.g. `FileTree/`) also have an
`index.ts` re-export.

Pick one convention and apply it everywhere. The cheapest choice is
"no `index.ts` anywhere" — less indirection, fewer files, imports
remain stable. (Skipping specific editor-adjacent folders here since
those are in flux.)

### `web/src/i18n/` is legitimately used — but barely

`web/src/i18n/index.tsx` exports `LANGUAGES`, `LANGUAGE_CODES`,
`isLanguageCode`, and `UnsupportedLanguagesNotice`. Consumed by
exactly one file: `web/src/routes/settings.tsx`.

Not a problem, just worth noting: a folder for one 53-line file that's
used in one place reads as more infrastructure than it is. Options:

1. Leave it (fine — it'll grow if pirate gains company).
2. Inline the `LANGUAGES`/notice into `settings.tsx` until there's a
   second consumer.

I'd leave it. Flagging only because it drew my eye twice.

### `AGENTS.md` is much thinner than `CLAUDE.md`

`AGENTS.md` (0.7KB) documents the port-5173 BetterAuth pin and the
"fail fast if port is taken" rule. `CLAUDE.md` is the comprehensive
reference. If other AI tooling reads `AGENTS.md` and not `CLAUDE.md`,
those tools miss the content-is-off-limits rule and the
AI-transparency-log rule — both of which matter.

Either (a) make `AGENTS.md` a one-line pointer to `CLAUDE.md` plus
the port-5173 note, or (b) mirror the critical "do not edit
`/content/`" and "append to transparency log" rules into
`AGENTS.md`. (a) is cheaper and keeps a single source of truth.

---

## Discarded claims

An earlier pass flagged these; I'm noting them so they don't
reappear in the next audit:

- **Admin route files are "duplicated boilerplate."** They're not —
  `routes/admin/{bundles,stats,users}.tsx` are 6–7 lines each because
  that's how TanStack file-based routing works. Consolidating them
  would fight the framework. Not a finding.
- **`web/src/i18n/` is unused.** It's used by `routes/settings.tsx`.
  See note above for the real (much smaller) observation.
- **`Footer` is imported but unused in `ai-transparency.tsx`.**
  Didn't verify; if this is real it's a one-line fix, if it isn't
  it's noise. Skipping.

---

## Not audited

Per the "editor is in flux" instruction, I skipped everything under
the workbench / code editor: `FileTree/`, `ModalManager/`, the
`playground` route body, and the code-runner worker. Revisit when
that surface settles.
