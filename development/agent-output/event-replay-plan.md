# Plan: editor event recording and replay

## Context

Two uses, shared infrastructure:

1. **Admin-authored demonstrations.** Record a mentor coding alongside
   narration audio. Post-process (crop, annotate). Upload the pair to
   R2. Students load the lesson and watch the editor animate itself as
   the audio plays — the audio timeline is authoritative, scrubbing
   the audio scrubs the editor.
2. **(Later) Student session replay.** Capture a student's editing
   history so a teacher can scrub through what they did. The event
   schema and replay engine are designed so a second recorder
   (silent, no audio, local storage) drops in when we get there.

Constraints from the user:

- The audio will **eventually** be the clock, but the replay engine
  must work **standalone first**. First UI is a scrubber that drives
  a `ManualClock`. Audio plugs in later as just another clock source
  — no coupling in the engine.
- Memory sensitivity: **do not** cache editor state per event.
  Bounded snapshot cadence + "insta-seek" via apply-from-snapshot.
- Recording is admin-only. Students load replays but do not record.
  The admin recorder publishes to R2; local save is a fallback.
- The editor and the event layer must land as **their own workspace
  packages**. Long-term we want to open-source the editor + replay
  as a standalone library.

## Scope

### Vertical slice (build now)

- Workspace packages `@learnrobotics/events` and
  `@learnrobotics/editor` extracted from `web/`.
- Event schema (`ReplayEvent` union) and a stable JSON-lines
  serialization format. Includes the new `highlight` and
  `auto-pause` variants.
- Single `EventDispatcher` chokepoint — every event in the system
  flows through one `emit()` with gated trace logging. Grep-able.
- Recorder: instruments Monaco (edits + cursor/selection). Zero-cost
  when idle (listeners not attached).
- Snapshot engine: precomputes periodic snapshots on load and uses
  them for O(≤N events-per-chunk) seek.
- Clock-decoupled replay engine. A `ManualClock` + `<input
type="range">` scrubber is the first UI.
- Three-stage recorder route (`/dev/record/{setup,capture,edit}`):
  - **Setup**: lesson metadata + starter files → seeds the `init`
    event.
  - **Record**: POC — Monaco event capture only. Audio is stubbed
    with a visible "planned" seam.
  - **Edit**: crop, insert `highlight`, insert `auto-pause`, export
    bundle. Pure functions in the events package.
- Vitest coverage on the events package (codec, snapshots,
  dispatcher, engine, edit helpers).

### Deferred (next slices, in rough order)

- Audio capture with `MediaRecorder` and the audio-driven clock.
  `LessonAudioController` component.
- R2 upload of `(audio.webm, events.jsonl, metadata.json)` under
  `lessons/<slug>/<version>/*`. Server route
  `/api/admin/upload-lesson` using `aws4fetch`.
- Starter-code from a file-style DB. Setup stage picks from the DB
  instead of raw textareas. No event-layer changes needed.
- File-tree UI plus the `file-create/delete/rename` events becoming
  live (schema already supports them).
- Playback-mode `PlaygroundStore` refactor (`files`, `activeFile`,
  `replay`, `record`) replacing the current single-file `source`
  signal.
- Student-session recording to D1 + mentor-review UI (same
  `recorder.start()` call, different destination + trigger).
- Highlight **target picker** UX (click an element to capture its
  selector instead of free-text input).
- Real auth/admin gating for the record route.
- Narration markers / chapter list, waveform scrubber, pointer
  overlay, diff mode.

## Package layout

Two new workspace packages (added by `packages/*` glob already in
`pnpm-workspace.yaml`; mirrors `packages/bundling/package.json`
shape).

### `packages/events` — `@learnrobotics/events`

Zero runtime dependencies. Pure types + logic. Both the editor
package and `web/` depend on this. Designed so it ships
standalone.

Files:

- `src/schema.ts` — `ReplayEvent` discriminated union,
  `MonacoChange`, `MonacoRange`. Schema version constant.
- `src/codec.ts` — JSON-lines encode/decode. Rejects unknown
  `type`s rather than silently dropping.
- `src/dispatcher.ts` — `EventDispatcher`: the single chokepoint.
  See §Dispatcher.
- `src/recorder.ts` — thin FSM over the dispatcher: `idle` /
  `buffering` / `finalized`.
- `src/snapshots.ts` — pure `buildSnapshots(events, {everyN,
everyMs})` and `resolveSeek(events, snapshots, currentIndex,
targetMs)`. No Monaco — operates on plain
  `Record<string, string>` through a `FileSink` interface.
- `src/engine.ts` — `ReplayEngine`: wires events + snapshots + a
  `FileSink` + a `Clock`. Exposes `seek(tMs)`, `play()`, `pause()`,
  `resume()` (the last for `auto-pause` resumption).
- `src/clock.ts` — `Clock` interface (`now(): number`, optional
  `subscribe(fn)`) plus `ManualClock`. Audio clock lands later in
  its own file.
- `src/edit-ops.ts` — Stage 3 post-production helpers:
  `cropEvents`, `insertHighlight`, `insertAutoPause`, with
  undo-stack-friendly immutability.
- `src/codec.ts` (already listed) also exposes:
  - `encodeBundle({events, audio?, metadata?}): Bundle` —
    deterministic canonical encoding used for hashing.
  - `hashBundle(bundle): Promise<string>` — sha256 hex. This is
    the recording id.
  - `fetchRecording(baseUrl, id): Promise<{events, metadata,
audioUrl?}>` — browser-side fetch from R2.
  - Node-compatible helpers for the GC script: `listRecordings`,
    `deleteRecording`. The package must work in both the browser
    and Node (no DOM assumptions in these functions).
- `src/index.ts` — barrel.
- `test/*.test.ts` — Vitest.

### `packages/editor` — `@learnrobotics/editor`

Depends on `@learnrobotics/events`, `monaco-editor`, and
`@monaco-editor/loader`. Owns all Monaco glue.

Files:

- `src/Monaco.tsx` — moved from
  `web/src/components/editor/Monaco/Monaco.tsx`. `onMount`
  signature extended to hand back `{ editor, monaco, model }`.
- `src/MonacoContainer.tsx`, `src/Loader.tsx` — moved verbatim.
- `src/utils.ts`, `src/types.ts` — moved; keeps `getOrCreateModel`.
- `src/bind-recorder.ts` — the **only** place Monaco listeners
  register events. Takes `(editor, dispatcher, { fileOf })`.
  Wires:
  - `model.onDidChangeContent` → `dispatcher.emit({type:"edit"…})`
    (respects `dispatcher.isPaused()`).
  - `editor.onDidChangeCursorPosition` → throttled ~10 Hz
    `cursor`.
  - `editor.onDidChangeCursorSelection` → throttled ~10 Hz
    `selection`.
    Returns a disposer. If the caller's recorder is `idle`, it never
    calls `bind-recorder` — listeners stay detached. Zero cost.
- `src/MonacoFileSink.ts` — `FileSink` implementation for the
  engine: `applyEdit` → `model.applyEdits`, `setActiveFile` →
  model switch, cursor/selection via `editor.setPosition /
setSelection`. File create/delete/rename operate on the passed
  `files` map plus Monaco model registry.
- `src/HighlightOverlay.tsx` — renders `highlight` events as a
  transient outline/arrow over the targeted selector. Mounted by
  the editor host in replay mode. Resolves targets in this
  order:
  - `editor:line:<n>` → Monaco decoration on that line.
  - `editor:range:<l1>:<c1>:<l2>:<c2>` → Monaco decoration.
  - `mdx:<id>` → `document.querySelector("[data-mdx-id='<id>']")`
    - overlay. This is the stable channel for pointing at
      content the author tagged in their lesson MDX (a span of
      prose, a figure, a video). See `content-plan.md` §"MDX
      highlight targets" for the author-side components.
  - Any other string → treated as a raw CSS selector + overlay.
    Escape hatch for things the first three channels don't cover.
    Overlay rendering handles three element kinds distinctly:
  - Inline text → a background-color highlight that follows the
    bounding boxes (handles wrapped lines).
  - Block (figure, image, video) → an outline around the bounds.
  - Monaco decoration → via the Monaco decoration API, not a DOM
    overlay.
- `src/PlayingRecordingIndicator.tsx` — persistent banner
  mounted at the top of the editor whenever the engine is in
  replay mode. Shows "Playing recording" + lesson title + an `X`
  close button. Clicking `X` calls `engine.stop()`, which:
  1. Clears the recording's models from Monaco.
  2. Restores the student's stashed working buffer (see
     `src/code-stash.ts`).
  3. Flips the editor back to editable.
     The banner is part of the editor package so the open-source
     library ships with the UX, not just the mechanics.
- `src/code-stash.ts` — when the host enters replay mode, stashes
  the current `{ files, activeFile, cursor }` to an in-memory
  slot (keyed by lesson id) + optionally `localStorage` under
  `learnrobotics:editor:stash:<lessonId>` so a reload mid-replay
  doesn't lose work. On `engine.stop()` the stash is popped and
  re-applied through the `FileSink`. The recording never writes
  to the student's buffer; the two file sets are kept strictly
  separate.
- `src/index.ts` — barrel.

Stories (`Monaco.stories.tsx`) move alongside the component and
re-import from `@learnrobotics/editor`.

## Event schema

JSON lines, one event per line. `t` is **milliseconds from recording
start** (not wall clock — portable across playbacks).

```ts
type ReplayEvent =
  | { t: 0; type: "init"; files: Record<string, string>; activeFile: string }
  | { t: number; type: "edit"; file: string; changes: MonacoChange[] }
  | { t: number; type: "cursor"; file: string; line: number; column: number }
  | { t: number; type: "selection"; file: string; ranges: MonacoRange[] }
  | { t: number; type: "active-file"; file: string }
  | { t: number; type: "file-create"; file: string; initialContent: string }
  | { t: number; type: "file-delete"; file: string }
  | { t: number; type: "file-rename"; from: string; to: string }
  | { t: number; type: "run" }
  | { t: number; type: "format" }
  | { t: number; type: "marker"; label: string }
  | { t: number; type: "highlight"; target: string; durationMs?: number }
  | { t: number; type: "auto-pause"; resumeOn?: "edit" | "button" };

type MonacoChange = {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
};
type MonacoRange = MonacoChange["range"];
```

Rules:

- The first event is always `init` at `t=0`. Replay-from-zero =
  `init.files` + apply remaining events in order.
- `cursor` / `selection` are throttled during recording (~10 Hz).
- `highlight` and `auto-pause` are **never emitted live**. They are
  inserted during Stage 3 (Edit). During replay:
  - `highlight` dispatches to `HighlightOverlay` for `durationMs`
    (default 2500 ms) then clears.
  - `auto-pause` halts the engine. If `resumeOn: "edit"`, the editor
    exits `readOnly` and the next model change triggers
    `engine.resume()`. If `resumeOn: "button"` (default), the host UI
    shows a Continue button.

## Dispatcher — the single chokepoint

Every event in the system passes through `dispatcher.emit(event)`.
There is no other way to add to the buffer; the `events` array is
not exported for mutation.

```ts
class EventDispatcher {
  emit(event: ReplayEvent): void; // appends, notifies subscribers, traces
  subscribe(fn: (e: ReplayEvent) => void): Disposer;
  pause(): void;
  resume(): void; // engine uses this during replay
  isPaused(): boolean; // bind-recorder checks this
  snapshot(): readonly ReplayEvent[]; // immutable view
  clear(): void; // tests
  setTrace(on: boolean): void;
}
```

Trace format, gated by `import.meta.env.DEV` or
`localStorage.setItem("events:trace","1")`:

```
[event t=1234 type=edit] file=Main.java changes=1 (+5 -0)
[event t=1456 type=cursor] file=Main.java L10:C14
[event t=2200 type=highlight] target=editor:line:7 duration=2500
```

Invariant to protect: grep `dispatcher.emit(` across the repo and
you have found every event source. Bind-recorder is the only live
call site; Stage 3 helpers return new arrays (they never touch the
live dispatcher).

## Recorder — three-stage pipeline

### Stage 1 — Setup

`web/src/routes/dev/record/setup.tsx`.

The recorder is a consumer of the content tree, not a standalone
tool. The author writes the lesson MDX first (see
`content-plan.md` §"Authoring workflow"), then launches Setup to
pick which lesson they're recording for.

Inputs:

- **Lesson picker**: dropdown of every `code` or `sim` lesson in
  the content tree. Selecting a lesson auto-populates the
  starter from the lesson's `starter:` frontmatter.
- Optional override: pick a different starter from
  `content/starters/`.
- Active file selector (defaults to the starter's `activeFile`).

Output: `RecorderSession` with the chosen lesson handle + starter
files map. Passed forward to Stage 2. Session-only; no persistence
across reloads in the POC.

### Stage 2 — Record (POC)

`web/src/routes/dev/record/capture.tsx`. Three-pane layout so the
author can read their script while recording:

- **Left**: the lesson MDX content, rendered as it will appear to
  the learner (reuses `CodeLesson`/`SimLesson`'s content pane
  component).
- **Center**: Monaco, mounted with the starter files from Stage 1.
- **Right** (optional, future): the simulator preview for `sim`
  lessons. Reserved space; not wired in the POC.

- **Start**:
  - `dispatcher.emit({ t: 0, type: "init", files, activeFile })`.
  - `recorder.start()` → `bind-recorder` attaches Monaco listeners.
  - `t0 = performance.now()`; subsequent events use
    `performance.now() - t0`.
- **Audio: stubbed.** A visible "Audio capture (planned)" label
  sits next to a disabled record button. The `RecorderSession`
  carries an optional `audioBlob?: Blob` that stays undefined.
  When audio lands, wire `MediaRecorder` here and share `t0`.
- **Stop**: finalize the event buffer. Hand `{ metadata, events }`
  to Stage 3.

### Stage 3 — Edit

`web/src/routes/dev/record/edit.tsx`. Post-production surface over
the finalized `events` array. Never mutates the live dispatcher.

- **Scrubber + preview**: readonly editor driven by
  `useReplayScrubber(events)`, which owns a `ManualClock`,
  `MonacoFileSink`, and `ReplayEngine`. Dragging the scrubber calls
  `engine.seek(value)`.
- **Crop**: two handles select `[tStart, tEnd]`. "Trim outside"
  calls `cropEvents(events, starterFiles, tStart, tEnd)`:
  - Replays events in `[0, tStart)` against `starterFiles` to get
    the mid-state file map.
  - Keeps events in `[tStart, tEnd]`, subtracts `tStart` from each
    `t`.
  - Rebuilds `init` from the mid-state file map and the active
    file at `tStart`.
    Audio cropping deferred — same `[tStart, tEnd]` applies to the
    blob when audio arrives.
- **Insert highlight**: a form (target input + duration) + button
  at the current scrubber `t`. Calls `insertHighlight(events, t,
target, durationMs)`.
- **Insert auto-pause**: a toggle (`resumeOn: "edit" | "button"`) +
  button at current `t`. Calls `insertAutoPause(events, t,
resumeOn)`.
- **Undo**: in-memory stack of previous event arrays. Covers
  accidental crops without over-engineering.
- **Publish**: computes the sha256 of the canonical bundle via
  `encodeBundle` + `hashBundle` (events-package codec), POSTs the
  bundle to `/api/admin/upload-lesson` (server-side route holds
  R2 creds) which writes `lessons/<sha256>/{events.jsonl,
metadata.json,audio.webm}`. On success, the UI shows the id so
  the author can paste it into the lesson's `recording:`
  frontmatter. Idempotent — same bytes → same id → same object.
- **Export (fallback)**: download the bundle as a local zip if
  the upload fails. Author can re-upload through the same server
  route from a dev script.

### Stage wiring

`/dev/record/index.tsx` is a breadcrumb landing page. The
`RecorderSession` is passed through route-level signal / context.
No cross-reload persistence in the POC.

## Snapshot + insta-seek engine

Memory target: never allocate a snapshot per event.

On load:

1. Parse events into an array.
2. Walk left-to-right, maintaining a transient
   `files: Map<string, string>`. Every **N** events (default 200)
   and every **T** ms (default 15000), freeze
   `{ eventIndex, files: {...} }`. Push to `snapshots`.
3. Drop the transient map. Keep only the snapshot array + event
   array.

`seek(tMs)`:

1. Binary-search `events` for the greatest `i` with
   `events[i].t <= tMs`.
2. Binary-search `snapshots` for the greatest snapshot with
   `eventIndex <= i`.
3. If `currentEventIndex` is between snapshot and `i` _and_ we are
   moving forward, apply `(currentEventIndex+1..i]` — normal
   `timeupdate` case.
4. Otherwise (backward seek, or long forward jump): restore the
   snapshot by setting each file's content, then apply
   `(snapshot.eventIndex+1..i]`.
5. While applying, `dispatcher.pause()` so `bind-recorder`'s
   listeners don't re-capture.
6. If an `auto-pause` event is in `applyRange`, stop applying there,
   mark `paused=true`, record the pending resumption trigger. The
   host UI handles resumption.

Rough math for a 20 min lesson, ~5 events/sec sustained, 10 KB of
source: 6000 events × ~100 B = 600 KB. Snapshots every 200 events =
30 snapshots × 10 KB = 300 KB. Well under a megabyte.

## Clock

```ts
interface Clock {
  now(): number; // ms since start
  subscribe(fn: (t: number) => void): Disposer;
}
```

First implementation `ManualClock`: driven by the scrubber. Later,
`AudioClock` wraps `<audio>`'s `timeupdate` + `seeking`.

The engine only reads `clock.now()` and `clock.subscribe`. It does
not know whether it is wrapping an audio element, a scrubber, or
nothing.

## Web app integration

- `web/src/routes/playground.tsx` — import `MonacoEditor` from
  `@learnrobotics/editor` (replaces the current dynamic import
  from `../components/editor/Monaco/Monaco`). No behavior change
  yet; still editable, no recording.
- `web/src/routes/dev/record/{index,setup,capture,edit}.tsx` —
  the three stages above. All gated by `import.meta.env.DEV`.
- `web/src/components/record/useReplayScrubber.ts` — shared hook
  that wires `ManualClock` + `MonacoFileSink` + `ReplayEngine` and
  returns scrubber bindings.
- `web/src/components/editor/**` — deleted after `git mv` into
  `packages/editor/src/**`.

## Verification

Unit tests only for this slice (Vitest, under
`packages/events/test/`).

1. `codec.test.ts` — round-trip hand-written events through
   `encode → decode`; assert deep equal; assert unknown-type
   throws.
2. `snapshots.test.ts` —
   - Build a 1000-event synthetic stream (random edits across 2
     files). `buildSnapshots` with `everyN: 200`.
   - For 20 random `t`s, `resolveSeek` + apply via a plain-JS
     `FileSink` equals naive "replay from 0 to i".
   - Forward seek (current index below target, no snapshot hop)
     returns empty `fromSnapshot` and a contiguous `applyRange`.
   - Backward seek restores from the correct snapshot.
3. `dispatcher.test.ts` —
   - `emit` while `pause()`d is dropped.
   - `subscribe` fires in insertion order.
   - `recorder.start()` → emits pass through; `idle` state drops.
4. `engine.test.ts` — scripted event stream + mock `FileSink`;
   seek through several timestamps; final `files` map matches
   reference. Includes an `auto-pause` run:
   `seek(tAfterPause)` halts at the pause's `t` and sets
   `paused=true`; `resume()` + `seek` continues through.
5. `edit-ops.test.ts` —
   - `cropEvents` round-trips: seeking the cropped result to
     `tEnd - tStart` equals seeking the original to `tEnd`.
   - `insertHighlight` / `insertAutoPause` return sorted arrays
     with the new event at the expected index.

Manual sanity (not automated): walk Setup → Record → Edit, record
~10 s of typing, trim the first 2 s, insert a highlight at 4 s and
an auto-pause at 6 s, scrub through the result.

## AI transparency

After implementation, append a `TransparencyLogEntry` to
`web/src/routes/ai-transparency.tsx` (newest on top, `date` = merge
day) noting: "extracted editor + events packages and added a first
clock-decoupled replay engine with a three-stage recorder POC."

## Files summary

**New packages**:

- `packages/events/{package.json,tsconfig.json,src/*,test/*}`
- `packages/editor/{package.json,tsconfig.json,src/*}`

**Moved** via `git mv` into `packages/editor/src/`:

- `web/src/components/editor/Monaco/Monaco.tsx`
- `web/src/components/editor/Monaco/Monaco.stories.tsx`
- `web/src/components/editor/MonacoContainer/`
- `web/src/components/editor/Loader/`
- `web/src/components/editor/types.ts`
- `web/src/components/editor/utils.ts`

**Modified**:

- `web/package.json` — add `@learnrobotics/editor`,
  `@learnrobotics/events`; drop any direct Monaco deps that
  migrate.
- `web/src/routes/playground.tsx` — import swap.
- `web/src/routes/ai-transparency.tsx` — log entry.

**New (web)**:

- `web/src/routes/dev/record/index.tsx`
- `web/src/routes/dev/record/setup.tsx`
- `web/src/routes/dev/record/capture.tsx`
- `web/src/routes/dev/record/edit.tsx`
- `web/src/components/record/useReplayScrubber.ts`

**Not touched**:

- `crates/compiler`, `webassembly/*`, `crates/teavm-javac` —
  pure JS/TS layer; teavm/ristretto don't need to know.
