# Plan: file-backed curriculum content in `/content/`

## Context

Today the curriculum lives as a single mock array
(`web/src/lib/courses-mock.ts`) — titles, kinds, and status flags,
nothing a learner can actually open. We need real content that the
new editor rebuild (see `event-replay-plan.md`) can host:

- Lessons are the smallest unit. Each has **at most one** starter
  project, **at most one** simulator, and **at most one** replay
  recording. Any of those can be omitted.
- Lessons group into **Chapters**, chapters into **Units** (the
  mock calls these "courses"; we're renaming to Unit to match
  the Unit/Chapter/Lesson hierarchy the user asked for).
- Content is authored as files on disk under `/content/`, not as
  TS literals. The build imports the tree and types it.
- Starter projects and simulator descriptions are **shared
  assets** — multiple lessons point at the same starter by id.

This slice does **not** implement the content pipeline. It plans
it and stubs the first two units (`intro-to-learnrobotics` and
`intro-to-java`). A follow-up slice wires the MDX importer,
schema validators, and route loader.

## Hierarchy

```
content/
  lib/
    define.ts                   # defineUnit/Chapter/Starter/Simulator/Lesson
    types.ts                    # TS types for each
  units/
    01-intro-to-learnrobotics/
      unit.ts                   # exports default defineUnit({...})
      01-orientation/
        chapter.ts              # exports default defineChapter({...})
        01-editor-tour.mdx      # lesson files, numbered
        02-why-java.mdx
        ...
      02-second-chapter/
        chapter.ts
        ...
    02-intro-to-java/
      unit.ts
      ...
  starters/
    main-hello-world/
      starter.ts                # exports default defineStarter({...})
      Main.java                 # file contents
    tip-calculator/
      starter.ts
      Main.java
      TipCalc.java
  simulators/
    tank-drive-basic/
      simulator.ts              # exports default defineSimulator({...})
    one-joint-arm/
      simulator.ts

# No yaml anywhere, no content/recordings/. Recordings are canonical
# in R2 only; the bucket is shared across local + prod.
```

Numeric prefixes on directories and files give an unambiguous
order without a separate manifest. `unit.ts`/`chapter.ts` export
a default-exported typed object built with `defineUnit` /
`defineChapter`; the slug comes from the stripped directory name
(`01-intro-to-learnrobotics` → `intro-to-learnrobotics`).

Every content asset is authored as a `.ts` or `.mdx` file — no
yaml, no json. Metadata objects are built through `defineX`
helpers in `content/lib/define.ts`, which are thin
identity-with-type functions (`<T>(x: T): T`) that give authors
full editor autocomplete and compile-time validation. Runtime
validation (Zod/Valibot) still runs at load time as a second
layer against bad shapes from dynamic sources.

Starters and simulators sit in sibling top-level folders so a
lesson can reference the same `main-hello-world` starter from any
unit without duplication. Recordings are **not** in the tree —
they live in R2 (`lessons/<id>/v<n>/...`), referenced by id +
version in lesson frontmatter. The R2 bucket is shared across
every environment (local dev + prod); authors upload directly,
test locally, and fix issues by re-uploading. No staging prefix,
no manifest, no build-time validation of recording refs — a
dangling recording surfaces as a visible load error the author
catches immediately.

## Lesson types

Four `kind`s. Every lesson is an MDX file; the lesson's metadata
object is a **named export** called `meta`, built through
`defineLesson`. The `kind` field on that object dictates which
component wraps the MDX body.

### `reading`

Plain prose + diagrams. MDX with Solid component embeds. No
editor, no simulator, no recording.

```mdx
import { defineLesson } from "../../../lib/define";

export const meta = defineLesson({
  id: "why-java",
  title: "Why Java?",
  kind: "reading",
  estMinutes: 5,
  difficulty: 1,
  importance: "useful",
});

# Why Java?

(prose...)
```

Renderer: `ReadingLesson.tsx` — centered column of MDX content.

### `code`

MDX lesson body (narrative, code snippets, callouts) alongside a
live editor pane. Optionally bound to a recording that the editor
plays back; optionally seeded by a starter.

```mdx
export const meta = defineLesson({
  id: "syntax",
  title: "Introduction to syntax",
  kind: "code",
  estMinutes: 12,
  difficulty: 1,
  importance: "essential",
  starter: "main-hello-world", // optional; refs content/starters/<id>/
  recording: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069", // optional; sha256
  language: "java", // optional; defaults to java
});
```

The `recording` id is a **sha256 of the recording bundle**
(deterministic encoding of `events.jsonl` + `audio.webm` if
present). Content-addressed means:

- No `version` field. Same bytes → same id. A re-edit is a new
  id, upload is idempotent.
- Lesson frontmatter pinning the id also pins the content. If a
  student replays months later with a locally-cached version of
  the events-package schema, the id lets them verify the
  recording hasn't drifted out from under them.
- R2 layout flattens to `lessons/<sha256>/{events.jsonl,
metadata.json,audio.webm}` — no version prefix.

Renderer: `CodeLesson.tsx` — split view, MDX on one side, editor
(from `@learnrobotics/editor`) on the other. If `recording` is
set, mounts in replay mode and shows the scrubber/audio surface
from the replay plan.

### `sim`

Same as `code` but the editor's output renders into a simulator
panel described by `content/simulators/<id>/`. The simulator
itself ships as code from a future `@learnrobotics/simulators`
package — this plan only standardizes the pseudocode descriptor
in content so lesson authors can reference stable sim ids.

```mdx
export const meta = defineLesson({
  id: "set-a-motor",
  title: "Setting a motor's speed",
  kind: "sim",
  estMinutes: 15,
  difficulty: 2,
  importance: "essential",
  starter: "tank-drive-skeleton",
  simulator: "tank-drive-basic",
  recording: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
});
```

Renderer: `SimLesson.tsx` — MDX pane, editor pane, simulator pane.
Three-column on wide screens; stacked on narrow.

### `quiz`

MDX authors the explanation; a `quiz` export owns the questions
and grading rules.

```mdx
export const meta = defineLesson({
  id: "hello-java-quiz",
  title: "Hello Java checkpoint",
  kind: "quiz",
  estMinutes: 8,
  difficulty: 1,
  importance: "essential",
});

export const quiz = defineQuiz({
  questions: [
    {
      kind: "multiple-choice",
      prompt: "...",
      choices: ["a", "b", "c"],
      answer: 2,
    },
    { kind: "short-answer", prompt: "...", accept: ["..."] },
    { kind: "code-matches", prompt: "...", expect: /.../ },
  ],
});

# Hello Java checkpoint

(prose explaining what the quiz covers)
```

`defineQuiz` lives in `content/lib/define.ts` next to the other
helpers. Question kinds are a discriminated union; adding a new
kind means extending the union + its renderer. Renderer:
`QuizLesson.tsx` — walks the questions, tracks per-question
state, records a final score.

## Shared assets

### `content/starters/<id>/starter.ts`

```ts
import { defineStarter } from "../../lib/define";

export default defineStarter({
  id: "main-hello-world",
  title: "Hello world skeleton",
  language: "java",
  activeFile: "Main.java",
  files: ["Main.java"],
});
```

File contents sit next to the `.ts`. The loader reads `files[]`,
resolves siblings via `import.meta.glob("./*", { as: "raw" })`,
and builds a `Record<string, string>`.

### `content/simulators/<id>/simulator.ts`

Pseudocode-level stub only — the real sim code belongs in a
package. This file reserves the id and documents what the sim is
supposed to do so content authors can point at it before the code
exists.

```ts
import { defineSimulator } from "../../lib/define";

export default defineSimulator({
  id: "tank-drive-basic",
  title: "Basic tank drive",
  description: `
    Two motors, left and right. User code sets speeds in [-1, 1].
    Sim renders a top-down rectangle on a field and integrates
    the motor speeds into x/y/heading.
  `,
  inputs: [
    { name: "leftSpeed", type: "double", range: [-1, 1] },
    { name: "rightSpeed", type: "double", range: [-1, 1] },
  ],
  outputs: [{ name: "pose", type: "Pose2d" }],
  notes: "Real implementation ships in @learnrobotics/simulators later.",
});
```

### `content/lib/define.ts`

```ts
export const defineUnit = <T extends UnitDef>(x: T) => x;
export const defineChapter = <T extends ChapterDef>(x: T) => x;
export const defineLesson = <T extends LessonDef>(x: T) => x;
export const defineStarter = <T extends StarterDef>(x: T) => x;
export const defineSimulator = <T extends SimulatorDef>(x: T) => x;
export const defineQuiz = <T extends QuizDef>(x: T) => x;
```

Thin identity functions. The type parameter is constrained so
authors get full autocomplete + inline type errors. The actual
union types (`UnitDef`, `LessonDef`, etc.) live in
`content/lib/types.ts` and are re-exported from
`packages/content` so other consumers (recorder, renderers) share
the same source of truth.

### Recordings in R2

Canonical, no in-tree copy. Content-addressed: the recording id
is a sha256 of the bundle, computed by the events-package codec
before upload. Layout per recording:

```
r2://<bucket>/lessons/<sha256>/
  events.jsonl       # one ReplayEvent per line
  metadata.json      # duration, schema version, created, hash algo
  audio.webm         # optional
```

Public read. CORS allows `GET` + `Range` from the app origin so
`<audio>` byte-range seeking and `fetch()` of `events.jsonl` both
work. Bucket is **shared across local dev and production** — one
less thing to configure, and there's no "it works in dev, breaks
in prod" class of recording bug.

Reads from the browser hit R2 directly. Writes go through a
server route (`/api/admin/upload-lesson`) that holds the R2
credentials; no credentials in client code.

Loader resolves `recording: <sha256>` → the R2 prefix above and
hands the URLs to the replay engine.

## Loader + types

A new `packages/content` package (zero-dep, pure TS):

- `src/types.ts` — re-exports from `content/lib/types.ts`. The
  TS types are the source of truth; the runtime schemas are
  derived from them.
- `src/schema.ts` — Zod/Valibot schemas mirroring the TS types,
  for second-layer runtime validation of the loaded index.
- `src/load.ts` — at build time, reads the `/content/` tree via
  Vite's `import.meta.glob` and emits a typed `contentIndex`:

  ```ts
  type ContentIndex = {
    units: Unit[]; // in directory order
    starters: Record<string, Starter>;
    simulators: Record<string, Simulator>;
    recordings: Record<string, RecordingHandle>;
  };
  ```

- `src/validate.ts` — fail the build on dangling `starter` /
  `simulator` / `recording` refs, duplicate ids, or missing files.

The `web/` app imports the index and routes it:

- `/units/:unitSlug` → unit landing.
- `/units/:unitSlug/:chapterSlug` → chapter landing.
- `/units/:unitSlug/:chapterSlug/:lessonSlug` → lesson, dispatched
  to the right renderer by `kind`.

## MDX importer

`web/vite.config.ts` gains `@mdx-js/rollup` (Solid variant) +
`remark-frontmatter` + `remark-mdx-frontmatter`. The MDX file exports:

- default — the body component.
- `meta` — the `defineLesson(...)` value (typed, no runtime
  parsing from yaml).
- `quiz` (quiz lessons only) — the `defineQuiz(...)` value.

`remark-frontmatter` / `remark-mdx-frontmatter` are **not** used.
Every piece of lesson metadata is a typed TS value.

MDX components come from two places:

**Global (provided via `MDXProvider`)** — content-agnostic
primitives every lesson can use without importing:

- `<Callout kind="note|warn|tip">…</Callout>`
- `<CodeBlock language="java">…</CodeBlock>` — syntax-highlighted
  via the same highlighter the editor uses.
- `<Figure src="..." caption="..." hid="...">` — images under a
  sibling `_assets/` directory. `hid` is an optional highlight id.
- `<Video src="..." hid="...">` — same shape as `Figure`.
- `<Hl hid="...">…</Hl>` — wraps a run of inline text so a
  recording can point at it. Renders as a plain `<span>` with
  no visual styling by default; only the overlay (triggered by a
  `highlight` replay event) makes it visible.
- Future: `<SimulatorInline id="...">` for embedded sim previews
  in reading lessons.

**Lesson-local** — Solid components colocated with the content
that uses them. A mecanum-drive chapter might ship:

```
content/units/03-advanced-drivetrains/01-mecanum/
  chapter.ts
  01-what-is-mecanum.mdx
  02-mecanum-math.mdx
  03-mecanum-drive-class.mdx
  components/
    MecanumWheelDemonstration.tsx   # SVG + Solid signals
    StrafeVectorDiagram.tsx
  _assets/
    mecanum-wheel.png
```

Imported with a normal relative path inside the MDX:

```mdx
import { MecanumWheelDemonstration } from "./components/MecanumWheelDemonstration";

# What a mecanum drive actually is

<MecanumWheelDemonstration speed={0.5} />

...prose...
```

Conventions:

- A `components/` dir sits next to the MDX files that need it.
  Siblings in the same directory share by relative import; nothing
  magic, no registration step.
- Components are plain Solid — free to use signals, `onMount`,
  `createEffect`, imports from `@learnrobotics/editor` for inline
  code, etc. They render into the content pane like any other
  JSX child; no sandboxing.
- Styling uses the app's existing Tailwind. Components live
  under `/content/`, so the Tailwind config's `content` glob
  must include `content/**/*.{ts,tsx,mdx}` for classes to be
  picked up.
- Keep components close to where they're used. A one-off diagram
  for a single lesson goes in that chapter's `components/`; a
  genuinely-reusable visualization that shows up in three units
  gets promoted to `content/lib/components/` and imported from
  there.
- The `packages/content` loader doesn't need to know about these
  components — they're ordinary module imports that Vite handles.
  The loader only indexes `unit.ts`/`chapter.ts`/lesson MDX /
  `starter.ts`/`simulator.ts`.

### MDX highlight targets

Every highlight-tagged component renders a stable DOM attribute
`data-mdx-id="<hid>"`. Recording events reference it as
`target: "mdx:<hid>"`. Grammar:

- `<Hl hid="pid-definition">proportional</Hl>` → recording can
  highlight the word `proportional` via `target:
"mdx:pid-definition"`.
- `<Figure hid="arm-diagram" src="..."/>` → outline the figure.
- `<Video hid="motor-spinup" src="..."/>` → outline the video
  frame.

`hid` values are **lesson-local** — they must be unique within a
single MDX file but may repeat across the tree. The validator in
`packages/content` enforces per-file uniqueness and warns on
unused `hid`s. The Stage-3 Edit UI in the recorder offers a
dropdown of valid `hid`s for the currently-loaded lesson when
inserting a `highlight` event, so authors don't typo selectors.

## Stubs — first two units

`content/units/01-intro-to-learnrobotics/` — port from
`courses-mock.ts` §`intro-to-learnrobotics`. One chapter
(`01-orientation`) with five lessons:

| File                     | kind    | notes                                         |
| ------------------------ | ------- | --------------------------------------------- |
| `01-editor-tour.mdx`     | code    | `starter: main-hello-world`, no recording yet |
| `02-why-java.mdx`        | reading |                                               |
| `03-time-management.mdx` | reading | (deduped from the mock's dup id)              |
| `04-why-no-robot.mdx`    | reading |                                               |
| `05-why-by-hand.mdx`     | reading |                                               |

`content/units/02-intro-to-java/` — port from
`courses-mock.ts` §`intro-to-java`. Eight chapters mapped
one-to-one from the mock (hello-java, variables, math,
first-mini-project, datatypes, oop, advanced-datatypes,
final-project). Lesson `kind`s translate:

- `reading` → `reading`
- `markdown-code` → `code`
- `java-console` → `code`
- `java-sim` → `sim`
- `quiz` → `quiz`

Each lesson file contains only frontmatter + a `TODO` body for
the POC. Starters created where the mock implies one:

- `main-hello-world` — referenced by `editor-tour`, `syntax`,
  `printing`.
- `tip-calculator` — referenced by `basics-mini-project`.
- `variables-skeleton`, `oop-skeleton` — referenced by the
  respective chapters.

No simulators or recordings for these two units — they don't need
them. Simulators appear in unit 3 and beyond
(tank drive, arms, etc.).

Duplicate-id warning: the mock has two lessons with
`id: "why-java"` in chapter 1, and `id: "variables"` and
`id: "math"` repeat across chapter/lesson scopes. The new scheme
scopes lesson ids to `<unit>/<chapter>/<lesson>`, so collisions
within a chapter directory are impossible; starter ids remain
globally unique and the validator enforces that.

## Authoring workflow (why content ships first)

The intended order is **script → record**:

1. Author writes the lesson MDX as a script. Everything the mentor
   plans to say and type lives in the lesson body + starter code.
2. Author opens the recorder, which **displays the lesson content
   and starter code side-by-side with the editor** so they can read
   their script while recording. The recorder consumes the content
   loader — it is not a standalone tool.
3. Author uploads the resulting bundle to R2 under a chosen
   `id + version`, then edits the lesson frontmatter to point at it.
4. Author reloads the lesson locally, verifies replay, iterates.

This workflow is why content planning blocks the recorder: the
recorder's UI is a consumer of the content tree. The replay plan
(`event-replay-plan.md`) gets updated to reflect that dependency.

## Deferred

- Real simulator implementations (`@learnrobotics/simulators`).
- **Dangling-recording GC script**: walks `content/` collecting
  every referenced sha256, lists R2 under `lessons/`, deletes any
  prefix that's (a) not referenced and (b) older than a
  configurable threshold. Runs as a Node script against the
  events-package R2 codec. Not this slice, but worth writing once
  recordings accumulate.
- Student progress storage (D1-backed `status: todo/in-progress/
done/placement-passed` persistence).
- Localization of lesson bodies — Paraglide covers UI strings;
  lesson MDX would need a translation workflow. For now,
  English-only.
- Prerequisite graph between lessons (the mock has
  `difficulty`/`importance` but no explicit deps).
- Authoring UI — files are hand-edited for now.
- R2 hosting for recordings (the loader points at local paths
  during dev; swap to R2 keys when recordings exceed repo size).

## Verification

Build-time:

- `packages/content` validator fails CI on schema errors,
  duplicate ids, dangling refs.
- `web/` typechecks the imported `contentIndex`.

Runtime:

- `/units` lists both stubbed units.
- Each stub lesson opens and renders its `kind`'s component.
- Vitest around `packages/content/src/load.ts` with a fixture
  content tree covering all four `kind`s plus a shared starter
  reference.

## Files summary

**New package**:

- `packages/content/{package.json,src/{schema,types,load,validate,index}.ts,test/*}`.

**New content tree** (stubs only this slice):

- `content/units/01-intro-to-learnrobotics/`
  (`unit.yaml` + `01-orientation/` with five lesson stubs).
- `content/units/02-intro-to-java/`
  (`unit.yaml` + eight chapter dirs, each with lesson stubs).
- `content/starters/{main-hello-world,tip-calculator,variables-skeleton,oop-skeleton}/`.

**Modified**:

- `web/vite.config.ts` — MDX plugin wiring.
- `web/package.json` — `@mdx-js/rollup`, remark plugins,
  `@learnrobotics/content`.
- `web/src/routes/units.$unitSlug.$chapterSlug.$lessonSlug.tsx`
  (new) — the renderer dispatcher.
- `web/src/lib/courses-mock.ts` — delete once the content loader
  lands; keep around during the transition.
