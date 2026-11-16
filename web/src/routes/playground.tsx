import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, onMount, Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import * as v from "valibot";
import { TopBar } from "~/components/TopBar/TopBar";
import type { MonacoEditorProps } from "~/components/editor/Monaco/Monaco";
import { useTheme } from "~/lib/theme-context";
import { m } from "~/paraglide/messages";

const SearchSchema = v.object({});

const DEFAULT_SOURCE = `class Main {
    public static void main(String[] args) {
        System.out.println("Hello, robot!");
    }
}
`;

export const Route = createFileRoute("/playground")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Playground,
});

function Playground() {
  const { monacoTheme } = useTheme();
  const [source, setSource] = createSignal(DEFAULT_SOURCE);
  const [running, setRunning] = createSignal(false);
  const [output, setOutput] = createSignal("");
  const [error, setError] = createSignal("");
  const [Editor, setEditor] = createSignal<Component<MonacoEditorProps> | null>(
    null,
  );

  onMount(async () => {
    const m = await import("~/components/editor/Monaco/Monaco");
    setEditor(() => m.MonacoEditor);
  });

  async function onRun() {
    setRunning(true);
    setOutput("");
    setError("");
    try {
      const [{ compileJava }, { runClasses, setLogHook }] = await Promise.all([
        import("~/lib/teavm"),
        import("~/lib/compiler"),
      ]);

      // Route ristretto's stdout/stderr + tracing into the output pane.
      setLogHook((message) => setOutput((prev) => prev + message + "\n"));

      const compiled = await compileJava(source());
      if (!compiled.ok) {
        setError(
          compiled.diagnostics
            .map(
              (d) =>
                `${d.fileName}:${d.lineNumber}${d.columnNumber ? ":" + d.columnNumber : ""} ${d.severity}: ${d.message}`,
            )
            .join("\n") || "compile failed (no diagnostics)",
        );
        return;
      }

      const mainClass = pickMainClass(compiled.classes);
      if (!mainClass) {
        setError(
          "compile ok, but could not find a .class to run. Output: " +
            compiled.classes.map((c) => c.name).join(", "),
        );
        return;
      }

      const result = await runClasses(compiled.classes, mainClass);
      if (!result.ok) setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  function pickMainClass(
    classes: { name: string; bytes: Uint8Array }[],
  ): string | null {
    // Prefer a top-level (non-inner) class whose file is `Foo.class`. Strip
    // package path and `.class` suffix.
    const outer = classes.find(
      (c) => c.name.endsWith(".class") && !c.name.includes("$"),
    );
    if (!outer) return null;
    return outer.name.replace(/\.class$/, "").replace(/\//g, ".");
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
            disabled={running()}
            onClick={onRun}
            class="rounded bg-primary px-4 py-2 text-sm text-background hover:opacity-80 disabled:opacity-60"
          >
            {running() ? m.playground_running() : m.playground_run()}
          </button>
        </div>
        <div class="grid min-h-0 flex-1 grid-cols-2 gap-4">
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
          <div class="min-h-0 overflow-auto rounded border border-background-offset p-3 font-mono text-xs">
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
              <div class="text-foreground-muted">{m.playground_idle_hint()}</div>
            </Show>
          </div>
        </div>
      </main>
    </>
  );
}

