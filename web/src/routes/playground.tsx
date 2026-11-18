import { createFileRoute } from "@tanstack/solid-router";
import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import * as v from "valibot";
import { TopBar } from "~/components/TopBar/TopBar";
import type { MonacoEditorProps } from "@learnrobotics/editor/code-editor";
import { bindRecorder } from "@learnrobotics/editor/code-editor/bind-recorder";
import { EventDispatcher } from "@learnrobotics/events";
import { registerThemes } from "~/lib/monaco-themes";
import { FileTree } from "~/components/FileTree";
import {
  generateDirectoryTree,
  collectAllDirectoryKeys,
} from "~/components/FileTree";
import { directoryListing } from "~/components/FileTree/directoryListing";
import { useTheme } from "~/lib/theme-context";
import { m } from "~/paraglide/messages";
import type { RunEvent, RunRequest } from "~/workers/code-runner.worker";

const SearchSchema = v.object({});

const DEFAULT_SOURCE = `class Main {
    public static void main(String[] args) {
        System.out.println("Hello, robot!");
    }
}
`;

type BundleState = "unknown" | "fetching" | "ready" | "failed";
type RunState = "idle" | "compiling" | "running";

export const Route = createFileRoute("/playground")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Playground,
});

function Playground() {
  const { monacoTheme } = useTheme();
  const [source, setSource] = createSignal(DEFAULT_SOURCE);
  const [bundleState, setBundleState] = createSignal<BundleState>("unknown");
  const [runState, setRunState] = createSignal<RunState>("idle");
  const [output, setOutput] = createSignal("");
  const [error, setError] = createSignal("");
  const [Editor, setEditor] = createSignal<Component<MonacoEditorProps> | null>(
    null,
  );

  let worker: Worker | null = null;

  function ensureWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(
      new URL("../workers/code-runner.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.addEventListener("message", (event: MessageEvent<RunEvent>) => {
      const msg = event.data;
      switch (msg.type) {
        case "phase":
          if (msg.phase === "fetching-deps") setBundleState("fetching");
          else if (msg.phase === "compiling") setRunState("compiling");
          else if (msg.phase === "running") setRunState("running");
          break;
        case "deps-ready":
          setBundleState("ready");
          break;
        case "log":
          setOutput((prev) => prev + msg.message + "\n");
          break;
        case "error":
          setError(msg.message);
          if (msg.stage === "fetch-deps") setBundleState("failed");
          setRunState("idle");
          break;
        case "done":
          setRunState("idle");
          break;
      }
    });
    worker.addEventListener("error", (event: ErrorEvent) => {
      setError(event.message || "worker crashed");
      setRunState("idle");
      if (bundleState() === "fetching") setBundleState("failed");
    });
    return worker;
  }

  onMount(async () => {
    const mod = await import("@learnrobotics/editor/code-editor");
    setEditor(() => mod.MonacoEditor);
    // Kick off the bundle download eagerly so the user isn't waiting on
    // first Run — ensureBundle caches, so the Run's own fetchDeps call
    // will reuse the in-flight promise rather than re-downloading.
    ensureWorker().postMessage({ type: "prefetch" } satisfies RunRequest);
  });

  const dispatcher = new EventDispatcher();
  let unbindRecorder: (() => void) | undefined;

  onCleanup(() => {
    worker?.terminate();
    worker = null;
    unbindRecorder?.();
  });

  function isBusy() {
    return runState() !== "idle" || bundleState() === "fetching";
  }

  function onRun() {
    if (isBusy()) return;
    setOutput("");
    setError("");
    // runState stays "idle" until worker reports "compiling" — but the
    // bundle fetch starts (or resumes) immediately, so the button
    // reflects that via bundleState.
    if (bundleState() !== "ready") setBundleState("fetching");
    ensureWorker().postMessage({
      type: "run",
      source: source(),
    } satisfies RunRequest);
  }

  function onStop() {
    // Terminating the worker is the only reliable way to interrupt a
    // ristretto VM mid-execution — there's no in-band cancel path.
    // The bundle cache in the fresh worker starts empty, so we drop
    // bundleState back to "unknown" and let the next Run refetch
    // (ensureBundle itself still dedups within a single worker).
    worker?.terminate();
    worker = null;
    setRunState("idle");
    setBundleState("unknown");
  }

  function buttonLabel() {
    if (bundleState() === "fetching") return "Downloading dependencies…";
    if (bundleState() === "failed") return "Retry";
    switch (runState()) {
      case "compiling":
        return m.playground_compiling();
      case "running":
        return m.playground_running();
      default:
        return m.playground_run();
    }
  }

  return (
    <>
      <TopBar />
      <main class="mx-auto flex h-[calc(100vh-56px)] max-w-6xl flex-col gap-4 px-6 py-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-semibold tracking-tight">
            {m.playground_heading()}
          </h1>
          <div class="flex items-center gap-2">
            <Show when={isBusy()}>
              <button
                type="button"
                data-testid="playground-stop"
                onClick={onStop}
                class="rounded border border-background-offset px-4 py-2 text-sm hover:opacity-80"
              >
                Stop
              </button>
            </Show>
            <button
              type="button"
              data-testid="playground-run"
              data-bundle-state={bundleState()}
              data-run-state={runState()}
              disabled={isBusy()}
              onClick={onRun}
              class="rounded bg-primary px-4 py-2 text-sm text-background hover:opacity-80 disabled:opacity-60"
            >
              {buttonLabel()}
            </button>
          </div>
        </div>
        <div class="grid min-h-0 flex-1 grid-cols-[220px_1fr_1fr] gap-4">
          <div class="min-h-0 overflow-hidden rounded border border-background-offset">
            {(() => {
              const root = generateDirectoryTree(directoryListing, "demo");
              return (
                <FileTree
                  root={root}
                  defaultExpandedKeys={collectAllDirectoryKeys(root)}
                />
              );
            })()}
          </div>
          <div class="min-h-0 overflow-hidden rounded border border-background-offset">
            <Show
              when={Editor()}
              fallback={
                <div class="p-3 text-xs text-foreground-muted">
                  {m.playground_loading_editor()}
                </div>
              }
            >
              <Dynamic
                component={Editor()!}
                language="java"
                value={source()}
                theme={monacoTheme()}
                path="Main.java"
                registerThemes={registerThemes}
                onChange={(val: string) => setSource(val)}
                onMount={(_m, ed) => {
                  unbindRecorder?.();
                  unbindRecorder = bindRecorder(ed, dispatcher, {
                    fileOf: () => "Main.java",
                  });
                }}
                options={{ minimap: { enabled: false }, fontSize: 13 }}
              />
            </Show>
          </div>
          <div
            class="min-h-0 overflow-auto rounded border border-background-offset p-3 font-mono text-xs"
            data-testid="playground-output"
          >
            <Show when={error()}>
              <div class="text-red whitespace-pre-wrap">{error()}</div>
            </Show>
            <Show when={output()}>
              <div class="whitespace-pre-wrap">
                <div class="mb-1 text-foreground-muted">
                  {m.playground_classfile_label()}
                </div>
                {output()}
              </div>
            </Show>
            <Show when={!error() && !output()}>
              <div class="text-foreground-muted">
                {m.playground_idle_hint()}
              </div>
            </Show>
          </div>
        </div>
      </main>
    </>
  );
}
