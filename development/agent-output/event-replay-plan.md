# Plan: editor event recording and audio-driven replay

## Context

Two uses, shared infrastructure:

1. **Admin-authored demonstrations.** Record a mentor coding alongside
   narration audio. Upload the pair to R2. Students load the lesson and
   watch the editor animate itself as the audio plays — the audio
   timeline is authoritative, scrubbing the audio scrubs the editor.
2. **(Later) Student session replay.** Capture a student's editing
   history so a teacher can scrub through what they did. Not in this
   slice — the event schema and replay engine are designed so a
   second recorder (silent, no audio, local storage) drops in when
   we get there.

Constraints from the user:

- The audio **is** the clock. No independent playback controls, no
  timer-driven event ticking. Everything is seek-driven off
  `audio.currentTime`.
- Memory sensitivity: **do not** cache editor state per event. Bounded
  snapshot cadence + "insta-seek" via apply-from-snapshot.
- Recording is admin-only in this slice. Students load replays but do
  not record. The admin recorder publishes to R2; local save is a
  fallback.

Lives alongside the workbench plan but doesn't depend on it — the
hooks drop in wherever Monaco is instantiated today
(`web/src/components/editor/Monaco/Monaco.tsx:252` already has
`automaticLayout: true`; we attach change listeners in the wrapper).

## Scope — this slice

**In**

- Event schema (`ReplayEvent` union) and a stable JSON-lines
  serialization format.
- Recorder: instruments Monaco (edits + cursor/selection) and a
  file-tree API surface that doesn't exist yet. The file-tree events
  are defined and the recorder exposes the hook functions
  (`recorder.fileCreate(name, initialContent)` …) so when the tree
  lands it just calls them.
- Snapshot engine: precomputes periodic snapshots of the file set on
  load and uses them for O(≤N events-per-chunk) seek.
- Audio-driven replay: a `<audio>` element drives `seek(tMs)` via
  `timeupdate` + `seeking`. No play/pause buttons of our own — the
  audio element's native controls (or a thin CSS-skinned wrapper) are
  the only interaction surface. Scrubbing the audio scrubs the editor.
- Playback mode flag in `PlaygroundStore`. When on:
  - Monaco becomes `readOnly: true`.
  - Toolbar buttons that write state are disabled.
  - A `LessonAudioController` component replaces the stub "Play lesson
    audio" button from the workbench plan — same spot in the lesson
    pane, now wired.
- **Unified recorder layer for admin and student, zero-cost when
  idle.** One `Recorder` module, one call site in `CodeEditorPanel`.
  Default state is `idle`: the Monaco event listeners **are not
  attached** and no events are constructed — the playground pays
  nothing for the recorder's existence. Admin recording and (future)
  student session capture both go through `recorder.start()`, which
  attaches the listeners and begins buffering. This is the "same
  event layer, no overhead for typical usage" invariant.
- Admin-only recorder route (`/record/playground`) gated by a stub
  `isAdmin()` check — `true` only when `env.ENVIRONMENT !== "production"`
  until we have real auth gates. Mic capture via `MediaRecorder` (webm
  audio), event capture in parallel.
- R2 upload of `(audio.webm, events.jsonl, metadata.json)` under
  `lessons/<slug>/<version>/*`, reusing the AwsClient pattern already
  in `webassembly/teavm-compiler/scripts/upload.mjs:*`. Fallback: a
  "download bundle as .zip" button that packages the three files for
  manual placement.
- A stub `LessonLoader` that, given a lesson slug, fetches the three
  R2 objects and hands them to the replay engine.
- Typed boundary: a `Recorder` interface that both the admin recorder
  and the (future) student recorder implement. Replay reads the same
  event schema regardless of source.

**Deferred**

- Student-session recording to D1 and mentor-review UI.
- Live collaboration / OT / CRDT — this is a one-way replay system,
  not multi-cursor editing.
- Diffing two sessions (student vs reference).
- Voice-over waveform scrubber with narration markers highlighted.
- Markers / chapters in the recording for seekable "chapter list"
  (the `marker` event type is defined; UI isn't).
- Screen-pointer overlay (showing where the mentor's mouse was).
- Real auth/admin gating for the record route.

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
  | { t: number; type: "run" }           // toolbar Run clicked
  | { t: number; type: "format" }        // toolbar Format clicked
  | { t: number; type: "marker"; label: string };

type MonacoChange = {
  range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
  text: string;
  // rangeLength omitted — recoverable from range and the current model if ever needed
};

type MonacoRange = MonacoChange["range"];
```

The first event is always `init` at `t=0` with the full starting
file set. Everything else is deltas. This makes the file an
unambiguous program: replay from `init` + apply events in order =
exact editor state at any `t`.

Cursor and selection events are throttled during recording (~10 Hz)
so a mentor scrubbing the cursor doesn't flood the log.

## Snapshot + insta-seek engine

Memory target: never allocate a snapshot per event.

On load:

1. Parse events into an array.
2. Walk events once, left to right, maintaining a transient
   `files: Map<string, string>`. Every **N** events (default 200) and
   every **T** ms (default 15000), freeze a snapshot
   `{ eventIndex, files: {...} }`. Push to `snapshots: Snapshot[]`.
3. Drop the transient map at the end. Keep only the snapshot array +
   event array in memory.

Seek(`tMs`):

1. Binary-search `events` for the greatest `i` with `events[i].t <= tMs`.
2. Binary-search `snapshots` for the greatest snapshot with
   `eventIndex <= i`.
3. If `currentEventIndex` is between snapshot and `i` *and* we're
   moving forward, just apply events `(currentEventIndex+1..i]` —
   normal case for `timeupdate`.
4. Otherwise (backward seek, or distance > some threshold): restore
   the snapshot by setting each Monaco model's value, then apply
   `(snapshot.eventIndex+1..i]`.
5. Set `currentEventIndex = i`. While applying, set a `replaying` flag
   so the recorder listeners ignore the Monaco change events they'd
   otherwise re-capture.

Rough math for a 20 min lesson, ~5 events/sec sustained, 10KB of
source across all files: 6000 events × ~100 B = 600KB. Snapshots
every 200 events = 30 snapshots × 10KB = 300KB. Well under a MB.

## Monaco integration

**Record:**

- `model.onDidChangeContent(e)` → `recorder.emit({t, type:"edit", file, changes: e.changes.map(trim)})`.
- `editor.onDidChangeCursorPosition(e)` → throttled emit `cursor`.
- `editor.onDidChangeCursorSelection(e)` → throttled emit `selection`.
- Attach these in a new `useMonacoRecorder(editor, recorder)` hook
  that `CodeEditorPanel` calls when the recorder is enabled.

**Replay:**

- `editor.updateOptions({ readOnly: true })` while in playback mode.
- Apply `edit`: `model.applyEdits(changes.map(c => ({range: c.range, text: c.text})))`.
- Apply `cursor`/`selection`: `editor.setPosition(...) / setSelection(...)`.
- Apply `active-file`: switch which model is shown in the editor.
- Apply `file-create`/`delete`/`rename`: mutate the file-tree store.
  No tree component yet — the store is defined, the UI plugs in later.
- Wrap each application in `recorder.pause() / resume()` so echoes
  don't get re-recorded in dual-mode scenarios (unnecessary in this
  slice but cheap).

## Audio as the clock

```tsx
<audio
  ref={setAudioEl}
  src={lesson.audioSrc}
  controls
  onTimeUpdate={() => replay.seek(audioEl.currentTime * 1000)}
  onSeeking={() => replay.seek(audioEl.currentTime * 1000)}
/>
```

- Native controls for v1. Styled later.
- `timeupdate` fires ~4 Hz — enough for fluid replay. Between fires,
  we're idle; we don't tick anything ourselves.
- If `lesson.audioSrc` is absent, playback falls back to a hidden
  audio element with a silent track of the lesson's duration, so the
  same code path drives everything.

## Recorder (admin-only)

Separate route: `web/src/routes/record.playground.tsx` or
`routes/record/playground.tsx`. Behind a stub admin gate that just
checks `env.ENVIRONMENT !== "production"` for now; swap in real auth
when we have it.

- On "Start recording": `MediaRecorder` on `navigator.mediaDevices.getUserMedia({audio:true})`,
  emits webm chunks. `recorder.start()` snapshots current files as the
  `init` event. Both get a shared `t0 = performance.now()`.
- Tab timers off `performance.now() - t0` for event `t` values.
- On "Stop": stop MediaRecorder, finalize events array, show a
  dialog: lesson slug + version + "Upload to R2" or "Download bundle".
- Upload path reuses `aws4fetch` AwsClient; we read creds via the
  existing `readR2Credentials()` helper in
  `webassembly/teavm-compiler/scripts/config.mjs` — but that's a Node
  script. For the browser recorder we'll need a server route
  (`/api/admin/upload-lesson`) that proxies the PUTs with creds from
  `web/.dev.vars`. This is a small endpoint, flagged below.

## PlaygroundStore additions

Grafted onto the type from the workbench plan:

```ts
replay: Accessor<ReplayHandle | null>;   // null = not in playback
record: Accessor<RecorderHandle | null>; // admin-only, null otherwise
activeFile: Accessor<string>;
files: Accessor<Record<string, string>>; // moved up from single `source`
```

Single-file `source` becomes `files["Main.java"]`. Monaco model
management owns which file is shown; `source()` compat shim stays
until the tree lands.

## Files

### New (library)

- `web/src/lib/replay/events.ts` — event types, type guards, schema
  version, JSON-lines encode/decode.
- `web/src/lib/replay/recorder.ts` — single `Recorder` module with
  three states: `idle` (listeners detached, zero cost), `buffering`
  (listeners attached, events appended to an in-memory array),
  `finalized` (immutable log ready to export). Admin recorder and
  future student recorder are both just `recorder.start() / stop()`
  callers — no separate implementations. Exposes
  `fileCreate/delete/rename/select` stub methods the tree can call
  later (they early-return in `idle` state).
- `web/src/lib/replay/snapshots.ts` — snapshot precomputation + seek
  resolution. Pure functions, unit-testable.
- `web/src/lib/replay/engine.ts` — `ReplayHandle`: wires audio
  element + Monaco editor + snapshot engine into a `seek(tMs)` call.
  Handles `replaying` flag to suppress recorder echoes.
- `web/src/lib/replay/lesson-loader.ts` — fetches
  `(audio.webm, events.jsonl, metadata.json)` from R2 given a slug.

### New (UI)

- `web/src/components/workbench/LessonAudioController.tsx` — replaces
  the stub audio button from the workbench plan. Owns the `<audio>`
  element and calls `replay.seek()` on update.
- `web/src/components/record/RecorderControls.tsx` — Start/Stop,
  waveform placeholder, upload dialog. Lives in the admin route.
- `web/src/routes/record.playground.tsx` — admin recorder route.
  Reuses `Workbench` with a `recordMode` prop.

### New (server)

- `web/src/routes/api/admin/upload-lesson.ts` — PUTs to R2 using
  creds from env. Validates slug, caps body size, writes three
  objects under `lessons/<slug>/<version>/`.

### Modified

- `web/src/components/editor/Monaco/Monaco.tsx` — expose `editor` and
  `model` refs through `onMount` so the recorder/engine can bind
  listeners. Already parameterised; just ensure the type leaks aren't
  swallowed.
- `web/src/components/workbench/panels/CodeEditorPanel.tsx` — if
  `replay()` is non-null, set `readOnly: true` on the editor. Hands
  the editor + model refs to the shared `recorder` on mount; the
  recorder itself decides whether to attach listeners based on its
  state. No conditional wiring here — the recorder stays a single
  call site.
- `web/src/components/workbench/playground-store.tsx` — add
  `replay` / `record` / `files` / `activeFile` fields. Keep the
  single-file `source` shim for the current pipeline.
- `web/messages/{en,pirate}.json` — keys for recorder controls
  (start/stop/upload/cancel), replay-mode banner, read-only hint.

### Not touched

- `crates/compiler`, `webassembly/*`, `crates/teavm-javac` — the
  replay system is pure JS/TS; teavm/ristretto don't need to know.

## Verification

1. Unit tests (Vitest) on `snapshots.ts`:
   - Given a synthetic event stream, verify `seek(t)` produces the
     same `files` map as naive replay-from-zero.
   - Forward seek after seek (common `timeupdate` case) short-circuits
     snapshot restoration.
   - Backward seek restores from the correct snapshot.
2. Playwright:
   - Open `/record/playground` (dev only). Grant mic. Click Start,
     type a few lines, click Stop, choose "Download bundle". Assert
     a .zip (or three files) downloaded.
   - Load a known-good bundle in playground replay mode. Play the
     audio. Assert the editor's final text matches the recording's
     final state. Scrub to midpoint, assert text matches the
     expected mid-state.
3. Manual sanity: two mics attached → `MediaRecorder` picks the
   default device. Playback on Chromebook (WASM-GC target).

## Follow-ups

- Student-session recorder: *same* `recorder.start()` call as admin;
  the only differences are destination (D1 `sessions` table keyed by
  user instead of R2) and trigger (classroom-mode flag or explicit
  opt-in rather than the admin route). No new event layer code — this
  is why the slice keeps admin and student on one module.
- Mentor-review UI: lists a student's recent sessions, lets the
  mentor replay them with the same engine, add timestamped comments.
- Narration markers: emit `marker` events from the admin recorder on
  a hotkey; render them as clickable chips on a skinned audio bar
  for "jump to the part where we talk about loops."
- Waveform rendering (wavesurfer.js or similar) + chapter overlay.
- Pointer-overlay recording: capture `mousemove` + `click` and render
  a ghost cursor over the editor during replay.
- Diff mode: given a reference recording and a student recording,
  show divergence points along the shared timeline.
- Compression: if a bundle starts exceeding ~2MB, swap `jsonl` for
  CBOR or protobuf; for now JSON lines gzips to ~20% of raw.
