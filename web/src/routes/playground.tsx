import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import * as v from "valibot";
import { TopBar } from "~/components/TopBar/TopBar";
import type { MonacoEditorProps } from "~/components/editor/Monaco/Monaco";
import { FileTree } from "~/components/FileTree";
import { generateDirectoryTree, collectAllDirectoryKeys } from "~/components/FileTree";
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

type Phase = "idle" | "compiling" | "running";

export const Route = createFileRoute("/playground")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Playground,
});

function Playground() {
  const { monacoTheme } = useTheme();
  const [source, setSource] = createSignal(DEFAULT_SOURCE);
  const [phase, setPhase] = createSignal<Phase>("idle");
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
          setPhase(msg.phase);
          break;
        case "log":
          setOutput((prev) => prev + msg.message + "\n");
          break;
        case "error":
          setError(msg.message);
          setPhase("idle");
          break;
        case "done":
          setPhase("idle");
          break;
      }
    });
    worker.addEventListener("error", (event: ErrorEvent) => {
      setError(event.message || "worker crashed");
      setPhase("idle");
    });
    return worker;
  }

  onMount(async () => {
    const m = await import("~/components/editor/Monaco/Monaco");
    setEditor(() => m.MonacoEditor);
  });

  onCleanup(() => {
    worker?.terminate();
    worker = null;
  });

  function onRun() {
    if (phase() !== "idle") return;
    setOutput("");
    setError("");
    setPhase("compiling");
    ensureWorker().postMessage({ type: "run", source: source() } satisfies RunRequest);
  }

  function buttonLabel() {
    switch (phase()) {
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
          <button
            type="button"
            data-testid="playground-run"
            data-phase={phase()}
            disabled={phase() !== "idle"}
            onClick={onRun}
            class="rounded bg-primary px-4 py-2 text-sm text-background hover:opacity-80 disabled:opacity-60"
          >
            {buttonLabel()}
          </button>
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
                onChange={(val: string) => setSource(val)}
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
