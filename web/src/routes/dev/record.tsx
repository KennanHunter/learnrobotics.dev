import { createFileRoute } from "@tanstack/solid-router";
import {
  createSignal,
  For,
  Match,
  Show,
  Switch,
  onCleanup,
  type Component,
  type JSX,
} from "solid-js";
import { useSession } from "@learnrobotics/db";
import {
  EventDispatcher,
  encodeBundle,
  encodeEvents,
  hashBundle,
  cropEvents,
  insertAutoPause,
  insertHighlight,
  insertHighlightClear,
  type ReplayEvent,
} from "@learnrobotics/events";
import {
  CodeRunner,
  CodeRunnerProvider,
} from "@learnrobotics/editor/variants/code-runner";
import { LessonArticlePane, ReadingLesson } from "@learnrobotics/editor";
import { TopBar } from "~/components/TopBar/TopBar";
import { getContentIndex } from "~/lib/content";
import { resolveStarter, type ResolvedStarter } from "~/lib/starters";
import { createCodeRunnerWorker } from "~/workers/create-code-runner-worker";
import { autoThemeFor, registerThemes } from "~/lib/monaco-themes";
import {
  useTabSize,
  useTheme,
} from "@learnrobotics/db";
import { getLocale } from "~/paraglide/runtime";
import { uploadRecordingAsset } from "~/server/recordings";

export const Route = createFileRoute("/dev/record")({
  component: RecordPage,
});

type Stage =
  | { kind: "setup" }
  | { kind: "capture"; session: RecorderSession }
  | {
      kind: "edit";
      session: RecorderSession;
      events: ReplayEvent[];
      audioBlob: Blob | null;
    }
  | { kind: "published"; id: string };

type RecorderSession =
  | {
      kind: "code";
      starter: ResolvedStarter;
      lessonId?: string;
      lessonTitle?: string;
      /** MDX article body — rendered in Capture so the author can read along
       * while recording. Undefined when the author records against a starter
       * without picking a lesson. */
      lessonBody?: Component;
    }
  | {
      kind: "reading";
      lessonId: string;
      lessonTitle: string;
      lessonBody: Component;
    };

function RecordPage() {
  const session = useSession();
  const [stage, setStage] = createSignal<Stage>({ kind: "setup" });

  return (
    <div class="grid h-screen grid-rows-[auto_1fr]">
      <TopBar />
      <Show
        when={session()?.isAdmin}
        fallback={
          <div class="flex items-center justify-center p-10 text-sm text-foreground-muted">
            Admins only.
          </div>
        }
      >
        <main class="min-h-0 overflow-auto">
          <Switch>
            <Match when={stage().kind === "setup"}>
              <SetupStage
                onContinue={(s) =>
                  setStage({ kind: "capture", session: s })
                }
              />
            </Match>
            <Match when={stage().kind === "capture"}>
              {(_) => {
                const s = stage() as Extract<Stage, { kind: "capture" }>;
                const onFinished = (events: ReplayEvent[], audioBlob: Blob | null) =>
                  setStage({
                    kind: "edit",
                    session: s.session,
                    events,
                    audioBlob,
                  });
                const onBack = () => setStage({ kind: "setup" });
                return s.session.kind === "reading" ? (
                  <CaptureReadingStage
                    session={s.session}
                    onFinished={onFinished}
                    onBack={onBack}
                  />
                ) : (
                  <CaptureStage
                    session={s.session}
                    onFinished={onFinished}
                    onBack={onBack}
                  />
                );
              }}
            </Match>
            <Match when={stage().kind === "edit"}>
              {(_) => {
                const s = stage() as Extract<Stage, { kind: "edit" }>;
                return (
                  <EditStage
                    initialEvents={s.events}
                    audioBlob={s.audioBlob}
                    session={s.session}
                    onPublished={(id) =>
                      setStage({ kind: "published", id })
                    }
                    onBack={() => setStage({ kind: "setup" })}
                  />
                );
              }}
            </Match>
            <Match when={stage().kind === "published"}>
              {(_) => {
                const s = stage() as Extract<Stage, { kind: "published" }>;
                return <PublishedStage id={s.id} />;
              }}
            </Match>
          </Switch>
        </main>
      </Show>
    </div>
  );
}

/* ------------------------------ Stage 1 ------------------------------ */

type LessonEntry =
  | {
      kind: "code";
      lessonId: string;
      lessonTitle: string;
      starterId: string;
      Body?: Component;
    }
  | {
      kind: "reading";
      lessonId: string;
      lessonTitle: string;
      Body: Component;
    };

function SetupStage(props: { onContinue: (s: RecorderSession) => void }) {
  const index = getContentIndex(getLocale());
  const lessons = (): LessonEntry[] => {
    const out: LessonEntry[] = [];
    for (const unit of index.units) {
      for (const chapter of unit.chapters) {
        for (const lesson of chapter.lessons) {
          if (lesson.kind === "code" || lesson.kind === "sim") {
            if (!lesson.starter) continue;
            out.push({
              kind: "code",
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              starterId: lesson.starter,
              Body: "Body" in lesson ? lesson.Body : undefined,
            });
          } else if (lesson.kind === "reading" && "Body" in lesson) {
            out.push({
              kind: "reading",
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              Body: lesson.Body,
            });
          }
        }
      }
    }
    return out;
  };

  const starters = Object.values(index.starters);

  const [mode, setMode] = createSignal<"code" | "reading">("code");
  const [starterId, setStarterId] = createSignal<string>(
    starters[0]?.id ?? "",
  );
  const [lessonChoice, setLessonChoice] = createSignal<string>("");

  const chosen = () => resolveStarter(starterId());
  const chosenLesson = (): LessonEntry | undefined =>
    lessons().find((l) => l.lessonId === lessonChoice());

  const codeLessonList = () =>
    lessons().filter((l): l is Extract<LessonEntry, { kind: "code" }> => l.kind === "code");
  const readingLessonList = () =>
    lessons().filter((l): l is Extract<LessonEntry, { kind: "reading" }> => l.kind === "reading");

  const canContinue = () => {
    if (mode() === "reading") {
      const l = chosenLesson();
      return l?.kind === "reading";
    }
    return Boolean(chosen());
  };

  const onContinue = () => {
    if (mode() === "reading") {
      const l = chosenLesson();
      if (l?.kind !== "reading") return;
      props.onContinue({
        kind: "reading",
        lessonId: l.lessonId,
        lessonTitle: l.lessonTitle,
        lessonBody: l.Body,
      });
      return;
    }
    const resolved = chosen();
    if (!resolved) return;
    const l = chosenLesson();
    props.onContinue({
      kind: "code",
      starter: resolved,
      lessonId: l?.kind === "code" ? l.lessonId : undefined,
      lessonTitle: l?.kind === "code" ? l.lessonTitle : undefined,
      lessonBody: l?.kind === "code" ? l.Body : undefined,
    });
  };

  return (
    <div class="mx-auto max-w-2xl px-6 py-10">
      <h1 class="text-xl font-semibold tracking-tight">Record a lesson</h1>
      <p class="mt-1 text-sm text-foreground-muted">
        Choose what kind of lesson you're recording.
      </p>

      <div class="mt-6 space-y-5">
        <div class="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("code");
              setLessonChoice("");
            }}
            classList={{
              "rounded border px-3 py-1.5": true,
              "border-primary bg-primary/10 font-medium": mode() === "code",
              "border-background-offset hover:bg-background-offset":
                mode() !== "code",
            }}
          >
            Code / sim
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("reading");
              setLessonChoice("");
            }}
            classList={{
              "rounded border px-3 py-1.5": true,
              "border-primary bg-primary/10 font-medium":
                mode() === "reading",
              "border-background-offset hover:bg-background-offset":
                mode() !== "reading",
            }}
          >
            Reading
          </button>
        </div>

        <Show when={mode() === "code"}>
          <label class="block text-sm">
            <span class="mb-1 block font-medium">Lesson (optional)</span>
            <select
              class="w-full rounded border border-background-offset bg-background px-2 py-1 text-sm"
              value={lessonChoice()}
              onChange={(e) => {
                const id = e.currentTarget.value;
                setLessonChoice(id);
                const match = codeLessonList().find((l) => l.lessonId === id);
                if (match) setStarterId(match.starterId);
              }}
            >
              <option value="">— none —</option>
              <For each={codeLessonList()}>
                {(l) => (
                  <option value={l.lessonId}>
                    {l.lessonTitle} ({l.starterId})
                  </option>
                )}
              </For>
            </select>
          </label>

          <label class="block text-sm">
            <span class="mb-1 block font-medium">Starter</span>
            <select
              class="w-full rounded border border-background-offset bg-background px-2 py-1 text-sm"
              value={starterId()}
              onChange={(e) => setStarterId(e.currentTarget.value)}
            >
              <For each={starters}>
                {(s) => <option value={s.id}>{s.title}</option>}
              </For>
            </select>
          </label>
        </Show>

        <Show when={mode() === "reading"}>
          <label class="block text-sm">
            <span class="mb-1 block font-medium">Reading lesson</span>
            <select
              class="w-full rounded border border-background-offset bg-background px-2 py-1 text-sm"
              value={lessonChoice()}
              onChange={(e) => setLessonChoice(e.currentTarget.value)}
            >
              <option value="">— pick one —</option>
              <For each={readingLessonList()}>
                {(l) => (
                  <option value={l.lessonId}>{l.lessonTitle}</option>
                )}
              </For>
            </select>
          </label>
        </Show>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            disabled={!canContinue()}
            onClick={onContinue}
            class="rounded bg-primary px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Stage 2 ------------------------------ */

function CaptureStage(props: {
  session: Extract<RecorderSession, { kind: "code" }>;
  onFinished: (events: ReplayEvent[], audioBlob: Blob | null) => void;
  onBack: () => void;
}) {
  const { effectiveTheme, monacoTheme } = useTheme();
  const monacoThemeName = () => monacoTheme() ?? autoThemeFor(effectiveTheme());
  const tabSize = useTabSize();

  const dispatcher = new EventDispatcher();
  const [recording, setRecording] = createSignal(false);
  const [elapsedMs, setElapsedMs] = createSignal(0);
  const [micError, setMicError] = createSignal<string | null>(null);

  let rig: RecorderRig | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  const starter = props.session.starter;

  // Pre-initialize the dispatcher with a paused state so no live events
  // land in the buffer before Start.
  dispatcher.pause();

  const onStart = async () => {
    try {
      rig = await startAudioRig(dispatcher);
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
      return;
    }
    setElapsedMs(0);
    elapsedTimer = setInterval(() => setElapsedMs(dispatcher.now()), 100);
    dispatcher.resume();
    dispatcher.emit({
      t: 0,
      type: "init",
      files: starter.files,
      activeFile: starter.activeFile,
    });
    setRecording(true);
  };

  const onStop = async () => {
    setRecording(false);
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = null;
    dispatcher.pause();
    const audioBlob = (await rig?.stop()) ?? null;
    rig = null;
    const events = dispatcher.snapshot().slice();
    props.onFinished(events, audioBlob);
  };

  onCleanup(() => {
    if (elapsedTimer) clearInterval(elapsedTimer);
    rig?.abort();
  });

  return (
    <div class="grid h-full grid-rows-[auto_1fr]">
      <div class="flex items-center gap-4 border-b border-background-offset px-4 py-2 text-xs">
        <button
          type="button"
          onClick={props.onBack}
          disabled={recording()}
          class="text-foreground-muted hover:text-foreground disabled:opacity-50"
        >
          ← Back
        </button>
        <span class="font-mono tabular-nums">
          {(elapsedMs() / 1000).toFixed(1)}s
        </span>
        <Show when={micError()}>
          <span class="text-red">Mic error: {micError()}</span>
        </Show>
        <div class="ml-auto flex items-center gap-2">
          <Show
            when={recording()}
            fallback={
              <button
                type="button"
                onClick={onStart}
                class="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white"
              >
                ● Start recording
              </button>
            }
          >
            <button
              type="button"
              onClick={onStop}
              class="rounded bg-background-offset px-3 py-1 text-xs font-medium"
            >
              ■ Stop
            </button>
          </Show>
        </div>
      </div>

      <div class="min-h-0">
        <CodeRunnerProvider
          starter={{ files: starter.files, activeFile: starter.activeFile }}
          createWorker={createCodeRunnerWorker}
        >
          <CodeRunner
            monacoTheme={monacoThemeName}
            tabSize={tabSize}
            registerThemes={registerThemes}
            dispatcher={dispatcher}
            articleSlot={
              props.session.lessonBody
                ? () => <LessonArticlePane Body={props.session.lessonBody!} />
                : undefined
            }
            toolbarLeft={() => (
              <span class="truncate text-sm font-semibold">
                {props.session.lessonTitle ?? starter.title}
              </span>
            )}
          />
        </CodeRunnerProvider>
      </div>
    </div>
  );
}

/* ----------------------- Stage 2 (reading variant) ----------------------- */

function CaptureReadingStage(props: {
  session: Extract<RecorderSession, { kind: "reading" }>;
  onFinished: (events: ReplayEvent[], audioBlob: Blob | null) => void;
  onBack: () => void;
}) {
  const dispatcher = new EventDispatcher();
  const [recording, setRecording] = createSignal(false);
  const [elapsedMs, setElapsedMs] = createSignal(0);
  const [micError, setMicError] = createSignal<string | null>(null);
  const [lastEmit, setLastEmit] = createSignal<string>("");

  let rig: RecorderRig | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;
  let articleRef: HTMLDivElement | undefined;

  dispatcher.pause();

  const now = () => dispatcher.now();

  const onStart = async () => {
    try {
      rig = await startAudioRig(dispatcher);
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
      return;
    }
    setElapsedMs(0);
    elapsedTimer = setInterval(() => setElapsedMs(dispatcher.now()), 100);
    dispatcher.resume();
    dispatcher.emit({ t: 0, type: "init", files: {}, activeFile: "" });
    setRecording(true);
  };

  const onStop = async () => {
    setRecording(false);
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = null;
    dispatcher.pause();
    const audioBlob = (await rig?.stop()) ?? null;
    rig = null;
    const events = dispatcher.snapshot().slice();
    props.onFinished(events, audioBlob);
  };

  // Click-to-emit: walk up from the clicked element looking for the nearest
  // [data-mdx-id] ancestor and emit a highlight event for it.
  const onArticleClick = (e: MouseEvent) => {
    if (!recording()) return;
    let node: HTMLElement | null = e.target as HTMLElement | null;
    while (node && node !== articleRef) {
      const hid = node.dataset?.mdxId;
      if (hid) {
        e.preventDefault();
        const target = `mdx:${hid}`;
        dispatcher.emit({ t: now(), type: "highlight", target });
        setLastEmit(`highlight ${target} @ ${(now() / 1000).toFixed(1)}s`);
        return;
      }
      node = node.parentElement;
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!recording()) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "Escape") {
      e.preventDefault();
      dispatcher.emit({ t: now(), type: "highlight-clear" });
      setLastEmit(`highlight-clear @ ${(now() / 1000).toFixed(1)}s`);
    } else if (e.code === "Space") {
      e.preventDefault();
      dispatcher.emit({
        t: now(),
        type: "auto-pause",
        resumeOn: "button",
      });
      setLastEmit(`auto-pause @ ${(now() / 1000).toFixed(1)}s`);
    }
  };

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    if (elapsedTimer) clearInterval(elapsedTimer);
    rig?.abort();
  });

  return (
    <div class="grid h-full grid-rows-[auto_1fr]">
      <div class="flex items-center gap-4 border-b border-background-offset px-4 py-2 text-xs">
        <button
          type="button"
          onClick={props.onBack}
          disabled={recording()}
          class="text-foreground-muted hover:text-foreground disabled:opacity-50"
        >
          ← Back
        </button>
        <span class="truncate font-semibold">{props.session.lessonTitle}</span>
        <span class="font-mono tabular-nums">
          {(elapsedMs() / 1000).toFixed(1)}s
        </span>
        <span class="truncate text-foreground-muted">
          Click any highlightable span · Esc = clear · Space = auto-pause
        </span>
        <span class="truncate font-mono text-primary">{lastEmit()}</span>
        <Show when={micError()}>
          <span class="text-red">Mic error: {micError()}</span>
        </Show>
        <div class="ml-auto flex items-center gap-2">
          <Show
            when={recording()}
            fallback={
              <button
                type="button"
                onClick={onStart}
                class="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white"
              >
                ● Start recording
              </button>
            }
          >
            <button
              type="button"
              onClick={onStop}
              class="rounded bg-background-offset px-3 py-1 text-xs font-medium"
            >
              ■ Stop
            </button>
          </Show>
        </div>
      </div>

      <div
        ref={(el) => (articleRef = el)}
        onClick={onArticleClick}
        class="min-h-0 overflow-auto"
      >
        <style>{`
          [data-mdx-id]:hover {
            outline: 2px dashed rgb(237 28 36 / 0.5);
            cursor: pointer;
          }
        `}</style>
        <LessonArticlePane Body={props.session.lessonBody} />
      </div>
    </div>
  );
}

/* ------------------------------ Stage 3 ------------------------------ */

function EditStage(props: {
  initialEvents: ReplayEvent[];
  audioBlob: Blob | null;
  session: RecorderSession;
  onPublished: (id: string) => void;
  onBack: () => void;
}) {
  const { effectiveTheme, monacoTheme } = useTheme();
  const monacoThemeName = () => monacoTheme() ?? autoThemeFor(effectiveTheme());
  const tabSize = useTabSize();

  const [events, setEvents] = createSignal<ReplayEvent[]>(props.initialEvents);
  const [undoStack, setUndoStack] = createSignal<ReplayEvent[][]>([]);
  const [publishing, setPublishing] = createSignal(false);
  const [publishError, setPublishError] = createSignal<string | null>(null);
  const [highlightTarget, setHighlightTarget] = createSignal("editor:line:1");
  const [scrubMs, setScrubMs] = createSignal(0);
  const [tStart, setTStart] = createSignal(0);
  const [tEnd, setTEnd] = createSignal(
    props.initialEvents.length > 0
      ? props.initialEvents[props.initialEvents.length - 1].t
      : 0,
  );

  // Blob URL is stable across event edits (same audio). The preview
  // re-mounts when the events-array identity changes — that resets audio
  // playback, which is fine for a dev tool.
  const audioUrl = props.audioBlob
    ? URL.createObjectURL(props.audioBlob)
    : null;
  onCleanup(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  });

  const duration = () => {
    const e = events();
    return e.length > 0 ? e[e.length - 1].t : 0;
  };

  const pushUndo = () => setUndoStack((prev) => [...prev, events()]);
  const onUndo = () => {
    const stack = undoStack();
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    setEvents(prev);
    setUndoStack(stack.slice(0, -1));
  };

  const starterFiles = () =>
    props.session.kind === "code" ? props.session.starter.files : {};
  const starterActiveFile = () =>
    props.session.kind === "code" ? props.session.starter.activeFile : "";

  const onCrop = () => {
    pushUndo();
    setEvents(
      cropEvents(
        events(),
        starterFiles(),
        starterActiveFile(),
        tStart(),
        tEnd(),
      ),
    );
    setTStart(0);
    setTEnd(duration());
  };

  const onInsertHighlight = () => {
    pushUndo();
    setEvents(insertHighlight(events(), scrubMs(), highlightTarget(), 2500));
  };

  const onInsertHighlightClear = () => {
    pushUndo();
    setEvents(insertHighlightClear(events(), scrubMs()));
  };

  const onInsertAutoPause = () => {
    pushUndo();
    setEvents(insertAutoPause(events(), scrubMs(), "button"));
  };

  const onPublish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      const metadata =
        props.session.kind === "code"
          ? {
              createdAt: new Date().toISOString(),
              kind: "code" as const,
              starterId: props.session.starter.id,
              starterTitle: props.session.starter.title,
              activeFile: props.session.starter.activeFile,
              durationMs: duration(),
            }
          : {
              createdAt: new Date().toISOString(),
              kind: "reading" as const,
              lessonId: props.session.lessonId,
              lessonTitle: props.session.lessonTitle,
              durationMs: duration(),
            };
      const audioBytes = props.audioBlob
        ? new Uint8Array(await props.audioBlob.arrayBuffer())
        : null;
      const bundle = encodeBundle({
        events: events(),
        metadata,
        audio: audioBytes,
      });
      const id = await hashBundle(bundle);

      const uploads: Promise<unknown>[] = [
        uploadRecordingAsset({
          data: {
            id,
            asset: "events",
            base64: textToBase64(encodeEvents(events())),
          },
        }),
        uploadRecordingAsset({
          data: {
            id,
            asset: "metadata",
            base64: textToBase64(JSON.stringify(metadata)),
          },
        }),
      ];
      if (audioBytes) {
        uploads.push(
          uploadRecordingAsset({
            data: {
              id,
              asset: "audio",
              base64: bytesToBase64(audioBytes),
            },
          }),
        );
      }
      await Promise.all(uploads);

      props.onPublished(id);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div class="grid h-full min-h-0 grid-rows-[1fr_auto]">
      {/* Row 1: live preview — same split-playback UI the student sees */}
      <div class="min-h-0">
        <Show
          when={audioUrl}
          fallback={
            <div class="flex h-full items-center justify-center text-xs text-foreground-muted">
              No audio recorded — nothing to preview.
            </div>
          }
        >
          {(url) => (
            <Show
              when={props.session.kind === "code"}
              fallback={
                <div class="h-full overflow-auto">
                  <ReadingLesson
                    title={
                      props.session.kind === "reading"
                        ? props.session.lessonTitle
                        : ""
                    }
                    Body={
                      props.session.kind === "reading"
                        ? props.session.lessonBody
                        : (() => null) as Component
                    }
                    recording={{ events: events(), audioUrl: url() }}
                  />
                </div>
              }
            >
              <CodeRunnerProvider
                starter={{
                  files: starterFiles(),
                  activeFile: starterActiveFile(),
                }}
                createWorker={createCodeRunnerWorker}
              >
                <CodeRunner
                  monacoTheme={monacoThemeName}
                  tabSize={tabSize}
                  registerThemes={registerThemes}
                  recording={{ events: events(), audioUrl: url() }}
                  toolbarLeft={() => (
                    <span class="truncate text-sm font-semibold">
                      Student preview ·{" "}
                      {props.session.kind === "code"
                        ? props.session.starter.title
                        : ""}
                    </span>
                  )}
                />
              </CodeRunnerProvider>
            </Show>
          )}
        </Show>
      </div>

      {/* Row 2: all the edit controls */}
      <div class="border-t border-background-offset bg-background">
        <div class="mx-auto max-w-5xl px-6 py-4 text-xs">
          <div class="flex items-center gap-3">
            <button
              type="button"
              onClick={props.onBack}
              class="text-foreground-muted hover:text-foreground"
            >
              ← Back
            </button>
            <h2 class="text-sm font-semibold">Edit recording</h2>
            <span class="font-mono text-foreground-muted">
              {events().length} events · {(duration() / 1000).toFixed(2)}s
              {props.audioBlob
                ? ` · audio ${(props.audioBlob.size / 1024).toFixed(1)} KB`
                : " · no audio"}
            </span>
          </div>

          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="space-y-2 rounded border border-background-offset p-3">
              <div class="font-medium">Markers @ scrubber</div>
              <ScrubRow
                label="Scrubber"
                value={scrubMs()}
                max={duration()}
                onInput={setScrubMs}
              />
              <div class="flex flex-wrap items-end gap-2">
                <input
                  type="text"
                  value={highlightTarget()}
                  onInput={(e) => setHighlightTarget(e.currentTarget.value)}
                  class="w-48 rounded border border-background-offset bg-background px-2 py-1"
                  placeholder="editor:line:12"
                />
                <button
                  type="button"
                  onClick={onInsertHighlight}
                  class="rounded border border-background-offset px-2 py-1 hover:bg-background-offset"
                >
                  + Highlight
                </button>
                <button
                  type="button"
                  onClick={onInsertHighlightClear}
                  class="rounded border border-background-offset px-2 py-1 hover:bg-background-offset"
                >
                  + Clear highlight
                </button>
                <button
                  type="button"
                  onClick={onInsertAutoPause}
                  class="rounded border border-background-offset px-2 py-1 hover:bg-background-offset"
                >
                  + Auto-pause
                </button>
              </div>
            </div>

            <div class="space-y-2 rounded border border-background-offset p-3">
              <div class="font-medium">Crop</div>
              <ScrubRow
                label="tStart"
                value={tStart()}
                max={duration()}
                onInput={setTStart}
              />
              <ScrubRow
                label="tEnd"
                value={tEnd()}
                max={duration()}
                onInput={setTEnd}
              />
              <button
                type="button"
                onClick={onCrop}
                class="rounded border border-background-offset px-2 py-1 hover:bg-background-offset"
              >
                Trim outside [tStart, tEnd]
              </button>
            </div>
          </div>

          <div class="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={undoStack().length === 0}
              class="rounded border border-background-offset px-2 py-1 hover:bg-background-offset disabled:opacity-50"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing()}
              class="ml-auto rounded bg-primary px-3 py-1.5 font-medium text-background disabled:opacity-50"
            >
              {publishing() ? "Publishing…" : "Publish → R2"}
            </button>
          </div>

          <Show when={publishError()}>
            <div class="mt-2 text-red">Error: {publishError()}</div>
          </Show>
        </div>
      </div>
    </div>
  );
}

function ScrubRow(props: {
  label: string;
  value: number;
  max: number;
  onInput: (v: number) => void;
}): JSX.Element {
  return (
    <div class="flex items-center gap-2">
      <span class="w-14 text-foreground-muted">{props.label}</span>
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.round(props.max))}
        step={10}
        value={props.value}
        onInput={(e) => props.onInput(Number(e.currentTarget.value))}
        class="flex-1 accent-primary"
      />
      <span class="w-20 text-right font-mono tabular-nums">
        {(props.value / 1000).toFixed(2)}s
      </span>
    </div>
  );
}

/* ----------------------------- Published ----------------------------- */

function PublishedStage(props: { id: string }) {
  const [copied, setCopied] = createSignal(false);
  return (
    <div class="mx-auto max-w-2xl px-6 py-10">
      <h2 class="text-lg font-semibold">Published</h2>
      <p class="mt-2 text-sm text-foreground-muted">
        Paste this id into the lesson's <code>recording:</code> frontmatter:
      </p>
      <div class="mt-4 flex items-center gap-2 rounded border border-background-offset bg-background-offset/30 px-3 py-2">
        <code class="flex-1 truncate font-mono text-xs">{props.id}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(props.id);
            setCopied(true);
          }}
          class="rounded border border-background-offset px-2 py-1 text-xs hover:bg-background"
        >
          {copied() ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

type RecorderRig = {
  /** Stop recording, resolve with the webm blob. */
  stop(): Promise<Blob | null>;
  /** Abort without producing a blob (used in onCleanup). */
  abort(): void;
};

/**
 * Wire mic → AudioContext → MediaStreamDestination → MediaRecorder so that
 * `audioCtx.currentTime` is the single clock shared with all event producers.
 * The dispatcher's `setClock` is pinned to `audioCtx.currentTime - t0Audio`
 * the moment MediaRecorder's `start` event fires, which aligns event
 * timestamps with the recorded audio's playback timeline.
 */
async function startAudioRig(
  dispatcher: EventDispatcher,
): Promise<RecorderRig> {
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) {
    micStream.getTracks().forEach((t) => t.stop());
    throw new Error("AudioContext not supported");
  }
  const audioCtx = new AudioCtor();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  const source = audioCtx.createMediaStreamSource(micStream);
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);

  const chunks: Blob[] = [];
  const mediaRecorder = new MediaRecorder(dest.stream, {
    mimeType: "audio/webm;codecs=opus",
  });
  mediaRecorder.addEventListener("dataavailable", (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  const started = new Promise<void>((resolve) => {
    mediaRecorder.addEventListener("start", () => resolve(), { once: true });
  });
  mediaRecorder.start(100);
  await started;
  const t0Audio = audioCtx.currentTime;
  dispatcher.setClock(() =>
    Math.round((audioCtx.currentTime - t0Audio) * 1000),
  );

  const teardown = () => {
    dispatcher.setClock(null);
    micStream.getTracks().forEach((t) => t.stop());
    source.disconnect();
    void audioCtx.close();
  };

  return {
    async stop(): Promise<Blob | null> {
      if (mediaRecorder.state === "inactive") {
        teardown();
        return null;
      }
      const stopped = new Promise<Blob>((resolve) => {
        mediaRecorder.addEventListener(
          "stop",
          () => resolve(new Blob(chunks, { type: "audio/webm" })),
          { once: true },
        );
      });
      mediaRecorder.stop();
      const blob = await stopped;
      teardown();
      return blob;
    },
    abort() {
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
      teardown();
    },
  };
}

function textToBase64(text: string): string {
  // Covers UTF-8 safely; browser `btoa` can't handle multi-byte directly.
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  // Chunk to avoid blowing out the call stack on large blobs.
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(bin);
}
