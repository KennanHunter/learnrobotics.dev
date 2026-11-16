# Plan: playground workbench — resizable panels + tabs + toolbar

## Context

The playground at `web/src/routes/playground.tsx` is a hardcoded
`grid-cols-2` with the code editor on the left and output on the right.
Everything fits in two fixed cells. We can't resize anything and we have
no obvious place to add future panels: controller input, simulation,
network tables, graphing of network table values, a tree viewer.

We want a VSCode-style workbench: resizable splitter regions that can
nest, each region hosting one or more panels as tabs. Plus a persistent
editor toolbar across the top with Run (works today), Format and Ask-AI
(scaffolded, stubbed). Future panels plug into the same primitives
without re-architecting.

The repo is a clean slate for this: no splitter library installed, no
tab primitives, no shared Button component. Full picture from exploration
is captured below.

## Scope — this slice

**In**

- Resizable panel system with nested horizontal/vertical splits.
- Lightweight tab bar per panel region so one cell can host multiple
  panels. First slice keeps it single-tab per panel but wires the primitive.
- Three default regions (left-to-right): **Lesson**, **Editor**, **Console**.
- **Lesson panel** on the left: scrollable prose area with a sticky
  "Play lesson audio" header at the top of the pane. For now the lesson
  text is placeholder markdown-ish content and the audio button is a
  stub (icon toggles play/pause, logs TODO on click). The point of this
  slice is to reserve and shape the pane so dropping real lesson data
  in later is a one-component swap.
- Top editor toolbar (above all panels) with:
  - **Run** — real, invokes the existing teavm→ristretto pipeline.
  - **Format** — calls Monaco's built-in `editor.action.formatDocument`.
    Not a real Java formatter, but the button is wired end-to-end so we
    can swap in a wasm formatter later. Keyboard: `Shift+Alt+F`.
  - **Ask AI** — placeholder button that logs TODO on click, visibly
    disabled with a tooltip. Icon-only; ready to light up when we have
    an endpoint.
- Layout persistence to localStorage per route (solid-resizable-panels
  handles this with an `autoSaveId`).
- A `Workbench` component that owns playground state (`source`, `output`,
  `error`, `running`) via a context so any future panel can read/write
  it without prop drilling.
- Keep the existing teavm + ristretto behaviour exactly — `onRun` logic
  moves, doesn't change.
- Storybook story for `Workbench` wired with a mocked `PlaygroundStore`
  so we can iterate on layout without running the whole compile stack.
- Playwright coverage: one test that the Run button still works
  end-to-end (we already have this); one test that the resize handle is
  draggable and the editor survives the resize.

**Deferred (named so we don't paint into a corner, but not in this PR)**

- Drag-to-rearrange tabs between panels.
- Adding/removing panels at runtime from a chrome menu.
- Floating / detached windows.
- The concrete future panels: controller input, simulation, network
  tables, graphs, tree viewer. The primitives will be ready; each
  panel is its own follow-up.
- A real Java formatter in-wasm. Monaco's built-in is a stub.
- Saving layouts per project/session (beyond localStorage).

## Dependencies

Add one package:

- `solid-resizable-panels` (or whichever Solid port is current; corvu's
  `Resizable` is the fallback if that package name has changed —
  verify on install). Covers nested splitters, keyboard a11y, double-
  click-to-reset, localStorage persistence.

Everything else uses what's already here: Tailwind 4 with the CSS-vars
theme in `web/src/styles.css`, `solid-icons` (Kennan's fork) for
toolbar icons, Paraglide for strings.

Not adding corvu / kobalte yet — tab bar is ~50 lines in Solid with
Tailwind, no a11y wins worth a new dep for a single-tab-per-pane
baseline.

## Architecture

```
PlaygroundRoute
└── PlaygroundProvider (context: source, output, error, running, lesson, onRun, …)
    └── Workbench
        ├── EditorToolbar
        │   ├── RunButton       → calls store.onRun
        │   ├── FormatButton    → calls editor.getAction("editor.action.formatDocument").run()
        │   └── AskAiButton     → TODO stub
        └── PanelGroup direction="horizontal" autoSaveId="playground"
            ├── Panel defaultSize=25 minSize=15                 // LESSON
            │   └── TabGroup
            │       └── Tab id="lesson" title="Lesson"
            │           └── LessonPanel
            │               ├── (sticky header) PlayLessonAudioButton
            │               └── <article> prose content
            ├── PanelResizeHandle
            ├── Panel defaultSize=45 minSize=25                 // EDITOR
            │   └── TabGroup
            │       └── Tab id="editor" title="Main.java"
            │           └── CodeEditorPanel (consumes store, hosts Monaco)
            ├── PanelResizeHandle
            └── Panel defaultSize=30 minSize=15                 // CONSOLE
                └── TabGroup
                    └── Tab id="output" title="Output"
                        └── ConsolePanel (consumes store, renders output/error)
```

Nested group example (for the "sim + console side-by-side" case we'll
hit soon): wrap the right Panel's contents in another `PanelGroup
direction="vertical"`. No new primitives needed.

### State: PlaygroundStore

A single Solid `createContext` + hook pair. The store owns everything
currently inside `Playground()` in `playground.tsx:24-93`:

```ts
type PlaygroundStore = {
  source: Accessor<string>;
  setSource: (next: string) => void;
  output: Accessor<string>;
  error: Accessor<string>;
  running: Accessor<boolean>;
  monacoRef: Accessor<MonacoEditor | null>;
  setMonacoRef: (editor: MonacoEditor) => void;
  onRun: () => Promise<void>;
  onFormat: () => Promise<void>;
  // Lesson fields are placeholders for now; the shape is what matters.
  lesson: Accessor<{ title: string; body: string; audioSrc?: string }>;
  audioPlaying: Accessor<boolean>;
  togglePlayAudio: () => void;
};
```

`onRun` is the existing `onRun()` moved verbatim from `playground.tsx`
with its teavm → ristretto → `setLogHook` plumbing intact. `onFormat`
captures the Monaco instance via `onMount` on the editor (new prop wire)
and runs `editor.trigger("playground", "editor.action.formatDocument",
null)`.

### TabGroup / Tab

Hand-rolled. Minimum viable:

- `TabGroup` is a Solid component that reads its direct `<Tab>` children
  via JSX (store the children in a signal keyed by `id` + `title`).
- Renders a header row with a button per tab, active state styled from
  Tailwind theme (`bg-background-offset` + `border-b-primary`).
- Only mounts the active tab's content, but keeps unmounted state
  alive via Solid's reactive signals in the store — Monaco in particular
  doesn't like being destroyed/recreated on tab switch, so we'll use
  CSS `hidden` for the single active-tab case too.

Keyboard a11y deferred (single-tab baseline). When we add a second tab
per pane, revisit with `aria-selected`, arrow-key cycling.

## Files

### New

- `web/src/components/workbench/Workbench.tsx` — top-level layout.
- `web/src/components/workbench/EditorToolbar.tsx` — toolbar row with
  Run / Format / Ask AI.
- `web/src/components/workbench/TabGroup.tsx` — hand-rolled tab host.
- `web/src/components/workbench/panels/CodeEditorPanel.tsx` — wraps the
  existing `MonacoEditor` and plugs it into `PlaygroundStore`.
- `web/src/components/workbench/panels/ConsolePanel.tsx` — renders
  `output()` / `error()` / idle hint. Moves the JSX from
  `playground.tsx:132-147` verbatim.
- `web/src/components/workbench/panels/LessonPanel.tsx` — sticky header
  row with the audio toggle button, a scrollable prose article below.
  Placeholder content from the store for now; renders `lesson().title`
  and `lesson().body` as Tailwind-styled prose. Audio button icon
  flips `FiPlay` ↔ `FiPause` from `audioPlaying()`, click goes through
  `store.togglePlayAudio` which just logs today.
- `web/src/components/workbench/playground-store.tsx` —
  `createContext` + `PlaygroundProvider` + `usePlayground` hook. All
  the signals currently living in `playground.tsx:24-93` move here.
- `web/src/components/workbench/Workbench.stories.tsx` — Storybook
  story using a mocked store so we can iterate on layout without the
  compile stack.

### Modified

- `web/src/routes/playground.tsx` — becomes a thin shell:
  `<PlaygroundProvider><Workbench /></PlaygroundProvider>`. All signals
  and `onRun` move into the store. `TopBar` stays in the shell (route
  chrome).
- `web/src/components/editor/Monaco/Monaco.tsx` — already resize-aware
  (`automaticLayout: true`, confirmed in the exploration). We'll wire a
  new `onMount` consumer in `CodeEditorPanel` to capture the editor
  instance into the store for the Format button.
- `web/messages/en.json` and `web/messages/pirate.json` — add keys
  `playground_format`, `playground_ask_ai`, `playground_output_tab`,
  `playground_editor_tab`, `playground_lesson_tab`,
  `playground_play_audio`, `playground_pause_audio`,
  `playground_ask_ai_todo`, plus `playground_lesson_placeholder_title`
  / `_body` for the stub lesson content so it's translator-aware from
  day one.
- `web/package.json` — add `solid-resizable-panels` (or corvu if the
  former no longer exists).
- `web/src/styles.css` — add a tiny splitter-handle style hook (a
  1px vertical/horizontal divider that widens to a hit-target on hover).
  Keep it in the theme so colour follows light/dark.

### Not touched

- `crates/compiler`, `crates/teavm-javac`, `webassembly/*` — compile
  pipeline is already fine.
- `TopBar`, routing, i18n infrastructure.

## Toolbar details

Layout: a flex row above the `PanelGroup`, 40px tall, border-bottom.
Buttons are 32px icon + optional label, `rounded hover:bg-background-offset
active:bg-background-offset/80`. Icons from `solid-icons/fi` (or
`solid-icons/hi` — the existing fork already exposes both):

- Run: `FiPlay`, becomes `FiSquare` + spinner-style disabled while
  `running()`.
- Format: `FiAlignLeft`.
- Ask AI: `FiZap` or similar, `disabled` + tooltip "Coming soon".

Keyboard:

- `Ctrl/Cmd+Enter` → Run (bound at the Workbench root, not the editor,
  so it works no matter which panel is focused).
- `Shift+Alt+F` → Format (Monaco already uses this; just ensure it's
  not swallowed).

## Shared-component note

We don't have a design-system button today — playground uses an inline
`<button class="rounded bg-primary …">`. Rather than inventing a design
system in this PR, the toolbar buttons will be a *local*
`ToolbarButton` component in `EditorToolbar.tsx`. When we eventually
have real UI primitives (kobalte / corvu), we lift this. Flagging it
so a later reader doesn't think it's load-bearing.

## Verification

1. `pnpm --filter learnrobotics-web dev` — manual sanity:
   - Three panes visible: Lesson left, Editor middle, Console right.
     Each has a tab header and the lesson pane has a sticky "Play
     lesson audio" button at its top.
   - Drag either splitter: all three panes reflow, Monaco keeps up via
     `automaticLayout`.
   - Reload the page: all resize positions persist (localStorage).
   - Click Run: output stream appears in the Console pane (teavm
     compile succeeds; ristretto still hangs as of today — same state
     as before this change).
   - Click Format on default source: indentation normalizes to
     Monaco's defaults. No console errors.
   - Click Ask AI: nothing happens, console shows the TODO log.
   - Click the Lesson audio button: icon flips play↔pause, console
     logs TODO. Scroll the lesson text — header stays stuck.
   - Keyboard: `Cmd+Enter` from inside the editor triggers Run.
2. `pnpm --filter learnrobotics-web test:e2e compiler.spec.ts` — the
   existing "javac diagnostics" test should still pass (it only
   touches the Run button, which the toolbar still exposes). The
   fixme'd ristretto test stays fixme'd.
3. New e2e `web/e2e/workbench.spec.ts`:
   - Load `/en/playground`, locate the resize handle (test id on
     `PanelResizeHandle` wrapper), drag it 100px, assert the editor
     width shrunk and no console errors fired.
4. `pnpm --filter learnrobotics-web storybook` — `Workbench` story
   renders, resize works inside Storybook.
5. `pnpm --filter learnrobotics-web test` — vitest suite stays green.

## Follow-ups (not this PR, named so we build with them in mind)

- Real lesson content pipeline: route param `/playground/:lesson` or a
  course-aware route that supplies `lesson` to the store; markdown
  rendering (likely `solid-markdown`); real audio file hookup with the
  existing `<audio>` element driven by `audioPlaying()`.
- Second tab in the output panel for a "Diagnostics" view, separating
  teavm's parse errors from runtime stdout.
- Controller input panel: registers under `panels/ControllerPanel.tsx`,
  uses the Gamepad API. Drop into the Workbench's right column as a
  new `Tab`.
- Simulation panel: likely needs its own `<canvas>`-hosting
  `SimulationPanel`. The parent Panel will need min-size / aspect-ratio
  controls that the current API already supports.
- Network tables + graphing: two panels sharing a store (similar
  pattern to `PlaygroundStore`).
- Tree viewer: adapt whichever OSS library (name TBD) — plug into
  `panels/TreePanel.tsx`.
- When we have ≥3 panels per region, upgrade `TabGroup` to a corvu-
  backed version for proper a11y + close/reorder affordances.
- Full docking (drag tabs between regions, floating windows) once the
  panel set stabilises.
