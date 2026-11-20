# Editor state & data flow

Agent handoff doc. The editor stack is working; a D1-backed persistence
layer is what's next. Server-side DB plumbing is already done (`project`
table, drizzle schema, server fns). What's missing is swapping the
client's localStorage drafts for those server fns, and loading projects
on the playground/lesson routes.

Everything below is _as of now_; verify against the files it names before
making structural assumptions.

## Variants (the four lesson/editor kinds)

The editor package exposes four variants through `packages/editor/src/Variants/`:

| Variant          | Purpose                               | Key files                            | Needs persistence?                                |
| ---------------- | ------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| `Reading`        | MDX article only; no editor           | `Variants/Reading/ReadingLesson.tsx` | No                                                |
| `JavaCodeRunner` | Monaco (java) + worker + console tabs | `Variants/JavaCodeRunner/*`          | **Yes**                                           |
| `MarkdownRunner` | Monaco (markdown) + live HTML preview | `Variants/MarkdownRunner/*`          | **Yes** (lightweight)                             |
| `Quiz`           | Multi-question quiz UI                | `Variants/Quiz/*`                    | Yes — separate table `quiz_result` already exists |

Only JavaCodeRunner and MarkdownRunner need the project persistence slice
below. Quiz has its own `saveQuizAttempt` server fn / `quiz_result`
table — out of scope here.

## Variant state shape

### JavaCodeRunner store (`Variants/JavaCodeRunner/playground-store.tsx`)

The provider mounts a reactive store that owns everything on the screen.
Persistable state is **only these three fields**:

```ts
files: Accessor<Record<string, string>>; // path -> content
activeFile: Accessor<string>; // which path the editor shows
// (implicit from caller) starter id passed as prop at mount
```

Everything else — stdout, diagnostics, bundleState, runState, tabBadges,
depsProgress — is session-scoped and must not survive a reload.

Mutations enter through four accessors:

- `setSource(next)` — writes `next` to `files[activeFile]`.
- `setFileContent(path, content)` — writes to arbitrary path.
- `setActiveFile(path)` — just moves the cursor; no file content change.
- Editor's `onChange` wires to `setSource` via `CodeEditorPane`.

### MarkdownRunner store (`Variants/MarkdownRunner/markdown-store.tsx`)

Simpler. Single markdown string:

```ts
source: Accessor<string>;
html: Accessor<string>; // derived: marked.parse(source())
```

Persistable: just `source`. A markdown "project" is effectively `{
files: { [activeFile]: source }, activeFile }` for `project` table
purposes — treat it as a one-file multi-file project so the same
schema serves both variants.

## Routes that need persistence

### `/playground` — `web/src/routes/playground.tsx`

Entry UX (already built):

- `/playground` (no `?s=`) → `<StarterPicker />` showing starter cards +
  a "Your drafts" section (today reads `localStorage`).
- `/playground?s=<starterId>` → workbench with starter resolved from
  `content/starters/<id>/`.

What a D1 persistence agent replaces:

- `web/src/components/StarterPicker/DraftPersist.tsx` — a small
  component mounted inside the provider that writes
  `localStorage["playground:draft:<starterId>"]` on debounced edits.
  Calls optional `onSaved`/`onDirty` callbacks the route uses to drive
  the autosave indicator.
- `web/src/components/StarterPicker/StarterPicker.tsx` —
  `loadDrafts()` scans localStorage keys with the `playground:draft:`
  prefix.
- `web/src/routes/playground.tsx:loadDraft` — reads the localStorage
  key at mount and seeds the provider.

Desired end state (D1 path):

- Instead of a single-blob-per-starter in localStorage, each save
  creates/updates a `project` row keyed by `(userId, id)` with
  `starterId` as a reference. Users can have multiple projects from the
  same starter.
- `/playground?s=<starterId>&project=<projectId>` — explicit project
  URL. If `project` is absent, create a new one on first edit and
  redirect, so the URL always reflects what's saved.
- `StarterPicker` fetches `listUserProjects()` in `beforeLoad` and
  shows them under "Your projects".

### Code lessons — `web/src/routes/units/$unit/$chapter/$lesson.tsx`

`<Match when={kind === "code"}>` → `CodeLessonView` which:

1. Resolves `lesson.starter` via `resolveStarter(id)` from
   `web/src/lib/starters.ts` (globbed from `content/starters/*/`).
2. Branches on `resolved.language === "markdown"` →
   `<MarkdownRunnerProvider starter={markdownBody}>` or default →
   `<JavaCodeRunnerProvider starter={{ files, activeFile }}>`.
3. Today: no persistence. Edits are lost on reload.

D1 wiring: look up the user's project for this `(userId, lessonId)` on
`beforeLoad`; if none, seed from `resolved.files` + `resolved.activeFile`;
if one exists, pass that to the provider instead. On edit, upsert the
same row. `project.starterId` is informative; the authoritative
identity for a lesson draft should probably be a separate column
(e.g. `lessonSlug text` or compose starterId with the lesson slug).
**Design decision pending** — see "Open questions" below.

## Server-side persistence (already done)

### Schema — `packages/db/src/schema/projects.ts`

```ts
project (
  id text pk,
  user_id text fk → user.id on delete cascade,
  title text not null,
  starter_id text,           // nullable: freeform scratchpads have no starter
  active_file text not null,
  files text (json) not null, // Record<path, content>, serialized
  created_at integer (ts) not null,
  updated_at integer (ts) not null,
  index (user_id),
  index (user_id, updated_at)
)
```

Migrations landed: `web/drizzle/0005_quiet_silvermane.sql`. Verify
applied locally with `pnpm --filter learnrobotics-web db:migrate`.

### Data layer — `packages/db/src/data/projects.ts`

`listProjects(userId): ProjectSummary[]` — no files, for listing UIs.
`getProject(userId, id): ProjectRecord | null` — full record with files.
`createProject(userId, input): ProjectRecord` — `crypto.randomUUID()`.
`updateProject(userId, id, patch): ProjectRecord` — merges title,
activeFile, files. Only patches provided fields.
`deleteProject(userId, id): boolean`.
`migrateProjectsOwner(fromId, toId)` — already wired for BetterAuth's
anonymous→named account linking (`packages/db/src/auth.ts:onLinkAccount`).

### Server fns — `web/src/server/projects.ts`

`listUserProjects`, `getUserProject`, `createUserProject`,
`updateUserProject`, `deleteUserProject`. All require a user via the
existing `requireUser()` which eagerly creates an anonymous session
(via BetterAuth's `anonymous` plugin) if none exists, so an
unauthenticated user still gets persistence — and it migrates to their
real account on login via the hook above.

Validation: files map capped at 512 KB JSON-serialized, title/activeFile
length-capped, id regex-safe.

## Client-side glue the D1 agent needs to replace

### DraftPersist (today) → ProjectPersist (target)

`web/src/components/StarterPicker/DraftPersist.tsx` is the template.
Key points to preserve:

- Debounced (~300ms) — the editor fires `setSource` on every keystroke.
- Reports lifecycle to the route via `onDirty` + `onSaved` callbacks
  (route uses them to drive the toolbar's autosave indicator).
- Mounted _inside_ the provider so it can `useJavaCodeRunner()` /
  `useMarkdownRunner()` to subscribe to `files()` + `activeFile()`.

Replacement mounts the same way, but instead of writing localStorage
calls a server fn:

- First edit on a new workbench (no `projectId` yet) →
  `createUserProject({ title, starterId, activeFile, files })`,
  redirect URL to include the returned `id`.
- Subsequent edits → `updateUserProject({ id, patch: { files,
activeFile } })`.
- Respect the existing `ProjectSummary.updatedAt` as the autosave
  timestamp so the UI reads a trustworthy value regardless of local
  clock skew.

Failure modes: handle 401-ish (session gone) and 500 (D1 blip) without
losing the user's buffer. Easiest: keep a localStorage fallback that's
written on every save attempt, cleared on confirmed server write.

### StarterPicker (today) → + "Your projects" (target)

`web/src/components/StarterPicker/StarterPicker.tsx` has a "Your
drafts" section that scans `localStorage`. Replace with a
`createResource(() => listUserProjects())` that groups by `starterId`
for display, keeps "no starter" (freeform scratch) as a separate
section. The existing card grid for starters stays — new projects
start from a starter template, same as today.

### Lesson route — `web/src/routes/units/.../$lessonSlug.tsx`

`CodeLessonView` constructs the provider's starter inline today. For
persistence, change the flow to:

1. In `beforeLoad` (or inside the component via
   `createResource`): fetch the user's project for this lesson, if any.
2. If found: pass the stored `{ files, activeFile }` to the provider.
3. If not: pass `resolved.files` / `resolved.activeFile` and have
   `ProjectPersist` create the row on first edit.

## Data flow walkthroughs

### Picking a starter and editing (playground)

1. User lands on `/en/playground` → SSR renders `<StarterPicker />`.
2. Picker loads from `~/lib/starters.ts` → `getStarters()` reads the
   content index's `starters` map, keyed by id.
3. Click → `navigate({ to: "/playground", search: { s: "<id>" } })`.
4. New route render: `resolveStarter(id)` → `{ files, activeFile,
language }`. Check for an existing draft for this `(user, starterId)`
   → seed provider.
5. `<CodeRunnerShell>` mounts (client-only — see gotcha below). Monaco
   loads in `onMount`, worker prefetches JDK.
6. Keystroke → `onChange` → `store.setSource(val)` → `files()` signal
   fires → `ProjectPersist`'s `createEffect` sees it → debounce →
   upsert server fn.

### Opening a code lesson

1. Route matches `kind === "code"`; `hit().lesson.starter` → id.
2. `resolveStarter` either returns Java (JavaCodeRunner) or markdown
   (MarkdownRunner) based on `starter.language`.
3. On mount, server fn query for the user's project for this lesson.
4. Workbench mounts, article pane shows `lesson.Body` MDX on the left,
   editor center, console right.
5. Autosave fires on edit like the playground does.

### Anonymous → named account

BetterAuth's `anonymous` plugin stages an anon user + cookie on first
request to any server fn. When the user signs in with GitHub, the
plugin fires `onLinkAccount` (`packages/db/src/auth.ts`) and
`migrateProjectsOwner(anonymousId, newId)` already reassigns all their
`project` rows. No extra work needed in the persistence slice.

## Gotchas (non-obvious things that'll save a day of debugging)

### 1. Workbench is client-only mounted

`packages/editor/src/Panels/CodeRunnerShell.tsx` uses `createSignal(false)`

- `onMount(() => setMounted(true))` + `<Show when={mounted()}>` with a
  matching `Loading editor…` fallback. SSR and first client render both
  emit the fallback; the real tree mounts after hydration. **Do not**
  replace this with `<NoHydration>` — that freezes the signal on the
  client and the editor never appears.

Any new persistence component (`ProjectPersist`, autosave indicator)
should live inside the provider so it mounts in the same client-only
phase.

### 2. Toolbar slots are function props

`JavaCodeRunner` and `MarkdownRunner` take `toolbarLeft?: () =>
JSX.Element` and `toolbarRight?: () => JSX.Element`. **Thunks, not
JSX.** Reason: solid-refresh wraps callers in HMR memos; if you pass
JSX directly, it claims a hydration key before the shell's mount gate
opens and hydration crashes. Any new toolbar content (save button,
rename, "unsaved changes" indicator) must go through a function.

### 3. localStorage lives under keys with `playground:draft:` prefix

`web/src/components/StarterPicker/StarterPicker.tsx` exports
`DRAFT_STORAGE_PREFIX`. If you want a migration path, read those keys
on first authenticated load and `createUserProject` them in, then
clear. Not strictly required — the data is low-value scratch.

### 4. Reactive props in Solid

`useJavaCodeRunner()` returns a store whose `.files`, `.activeFile`
are accessors — call them. Don't destructure `store.files` out and
pass around; you'll lose reactivity. `ProjectPersist`'s `createEffect`
must read `store.files()` / `store.activeFile()` _inside_ the effect
so the dependency tracker picks them up.

### 5. Verification harness

`web/e2e/workbench-diag.spec.ts` loads both `/playground?s=...` and the
`editor-tour` code lesson, waits 8s, asserts `workbench-root` mounted,
Monaco textarea present, no page errors, no failed requests. Run it
after any persistence edit:

```
pnpm --filter learnrobotics-web test:e2e workbench-diag
```

If it stays green, the mount chain is intact.

## Open questions for the D1 agent

1. **Lesson draft identity.** `project.starterId` is fine for playground
   sessions, but a lesson's draft needs to be keyed by lesson, not by
   starter (two different lessons could share a starter). Options:
   (a) add a `lesson_slug` column, (b) encode it into `starterId` as
   `"<starterId>#<lessonSlug>"`, (c) new `lesson_draft` table. (a) is
   cleanest if you're willing to add a migration.
2. **One project per starter or many?** Current localStorage is
   one-per-starter. D1 schema supports many-per-user-per-starter via
   `id` PK. Decide which the UX wants: a "new draft" button or
   implicit single-slot.
3. **Titles.** `project.title` is required. For playground, auto-generate
   from starter title + date? For lessons, use lesson title? Need a
   default.
4. **Delete UX.** `deleteUserProject` exists server-side; UI to invoke
   it should land with the "Your projects" list.
5. **Conflict handling if two tabs edit the same project.** Debounced
   last-write-wins is probably fine for v1; flag the trade-off.

## Files to touch (expected set)

Client:

- `web/src/components/StarterPicker/DraftPersist.tsx` →
  rewrite as `ProjectPersist` that calls server fns.
- `web/src/components/StarterPicker/StarterPicker.tsx` →
  add "Your projects" section backed by `listUserProjects`.
- `web/src/routes/playground.tsx` → load+save projects, URL carries
  `project` id.
- `web/src/routes/units/.../$lessonSlug.tsx` → load user's project for
  this lesson on mount; mount `ProjectPersist` inside the provider.

Server: none, unless deciding to add `lesson_slug` → one migration +
a server fn update.

Tests:

- Extend `web/e2e/workbench-diag.spec.ts` or add a sibling spec that
  logs in (or uses anon session), edits, reloads, asserts content
  persists.

## Recommended implementation order

The DB side is already landed; the following sequence keeps each step
independently shippable and verifiable so a regression surfaces against
a small diff rather than the whole slice.

1. **`ProjectPersist` component** (replaces `DraftPersist`) —
   client-only, mounted inside the provider, same debounce + callback
   shape as today. On first dirty tick with no `projectId` prop,
   `createUserProject` and emit the new id via a new `onCreated(id)`
   callback; subsequent ticks `updateUserProject`. Localstorage fallback
   on failure so the buffer survives a server blip. Nothing else moves
   yet — route still mounts `DraftPersist`.
2. **Playground route wiring** — swap `<DraftPersist>` for
   `<ProjectPersist>`; thread `project` id through the URL via
   `search.project`; on `onCreated`, `navigate({ search: { s, project }
})` so refreshes restore the same row.
3. **StarterPicker "Your projects"** — `createResource(() =>
listUserProjects())`; group by `starterId` with freeform
   (`starterId === null`) as its own bucket. Keep localstorage drafts
   section rendering only if any keys still exist, so returning users
   see their old drafts until they migrate or drop them.
4. **Lesson route wiring** — same `ProjectPersist`, keyed per lesson.
   Needs the lesson-identity decision from "Open questions" #1 first;
   recommend (a) `lesson_slug text` column + a one-line migration, as
   it keeps `starterId` meaning what it says. Until that migration
   lands, lesson persistence stays disabled.
5. **Delete UX** — small X on each "Your projects" card calling
   `deleteUserProject`. Low-risk, last.

## Status of open questions after the DB landing

1. **Lesson identity** — still open; recommend `lesson_slug` column.
2. **One vs many per starter** — resolved: many. Schema allows it; the
   playground URL now carries an explicit `project` id so "new draft"
   is a route action, not a hidden slot.
3. **Titles** — still open; starter title + short date is a reasonable
   default for playground, lesson title for lessons.
4. **Delete UX** — step 5 above.
5. **Two-tab conflicts** — accept last-write-wins for v1; revisit only
   if a user actually hits it.
