import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal, ErrorBoundary, Show } from "solid-js";
import * as v from "valibot";
import { TopBar } from "~/components/TopBar/TopBar";
import { EventDispatcher } from "@learnrobotics/events";
import {
  JavaCodeRunner,
  JavaCodeRunnerProvider,
  useJavaCodeRunner,
} from "@learnrobotics/editor/variants/java-code-runner";
import { autoThemeFor, registerThemes } from "~/lib/monaco-themes";
import { useTheme } from "@learnrobotics/db";
import { m } from "~/paraglide/messages";
import { resolveStarter } from "~/lib/starters";
import {
  StarterPicker,
  DraftPersist,
  DRAFT_STORAGE_PREFIX,
} from "~/components/StarterPicker";
import { createCodeRunnerWorker } from "~/workers/create-code-runner-worker";

const SearchSchema = v.object({
  s: v.optional(v.string()),
});

export const Route = createFileRoute("/playground")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Playground,
});

type SavedDraft = {
  activeFile: string;
  files: Record<string, string>;
};

function loadDraft(starterId: string): SavedDraft | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(DRAFT_STORAGE_PREFIX + starterId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.files || !parsed?.activeFile) return null;
    return { activeFile: parsed.activeFile, files: parsed.files };
  } catch {
    return null;
  }
}

function Playground() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { effectiveTheme, monacoTheme } = useTheme();
  const monacoThemeName = () =>
    monacoTheme() ?? autoThemeFor(effectiveTheme());

  return (
    <>
      <TopBar />
      <main class="h-[calc(100vh-56px)] min-h-0">
        <Show when={search().s} fallback={<StarterPicker />}>
          {(starterId) => {
            const resolved = resolveStarter(starterId());
            if (!resolved) {
              return (
                <div class="mx-auto max-w-2xl px-6 py-16 text-center">
                  <p class="text-sm text-foreground-muted">
                    Starter "{starterId()}" not found.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/playground", search: {} })}
                    class="mt-4 rounded border border-background-offset px-4 py-2 text-sm hover:bg-background-offset"
                  >
                    Back to picker
                  </button>
                </div>
              );
            }
            const draft = loadDraft(starterId());
            const starter = draft
              ? { files: draft.files, activeFile: draft.activeFile }
              : { files: resolved.files, activeFile: resolved.activeFile };
            const dispatcher = new EventDispatcher();
            const [savedAt, setSavedAt] = createSignal<number | null>(null);
            const [dirtyAt, setDirtyAt] = createSignal<number | null>(null);

            return (
              <ErrorBoundary
                fallback={(err, reset) => (
                  <div class="p-6 text-sm">
                    <div class="font-mono text-red">
                      Workbench crashed:{" "}
                      {err instanceof Error ? err.message : String(err)}
                    </div>
                    <pre class="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-foreground-muted">
                      {err instanceof Error ? err.stack : String(err)}
                    </pre>
                    <button
                      type="button"
                      onClick={reset}
                      class="mt-3 rounded border border-background-offset px-3 py-1 text-xs"
                    >
                      retry
                    </button>
                  </div>
                )}
              >
                <JavaCodeRunnerProvider
                  starter={starter}
                  createWorker={createCodeRunnerWorker}
                >
                  <DraftPersist
                    starterId={resolved.id}
                    starterTitle={resolved.title}
                    onSaved={setSavedAt}
                    onDirty={setDirtyAt}
                  />
                  <JavaCodeRunner
                    monacoTheme={monacoThemeName}
                    registerThemes={registerThemes}
                    dispatcher={dispatcher}
                    toolbarLeft={() => (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ to: "/playground", search: {} })
                          }
                          class="text-xs text-foreground-muted hover:text-foreground"
                        >
                          ← All starters
                        </button>
                        <span class="truncate text-sm font-semibold tracking-tight">
                          {resolved.title}
                        </span>
                      </>
                    )}
                    toolbarRight={() => (
                      <>
                        <AutosaveIndicator
                          savedAt={savedAt()}
                          dirtyAt={dirtyAt()}
                        />
                        <ExportButton starterId={resolved.id} />
                      </>
                    )}
                    labels={{
                      run: m.playground_run(),
                      compiling: m.playground_compiling(),
                      running: m.playground_running(),
                      loadingEditor: m.playground_loading_editor(),
                    }}
                  />
                </JavaCodeRunnerProvider>
              </ErrorBoundary>
            );
          }}
        </Show>
      </main>
    </>
  );
}

function AutosaveIndicator(props: {
  savedAt: number | null;
  dirtyAt: number | null;
}) {
  const label = () => {
    const saved = props.savedAt;
    const dirty = props.dirtyAt;
    if (saved == null && dirty == null) return "Unsaved";
    if (dirty != null && (saved == null || dirty > saved)) return "Saving…";
    return "Saved";
  };
  return (
    <span class="text-[11px] text-foreground-muted" aria-live="polite">
      {label()}
    </span>
  );
}

function ExportButton(props: { starterId: string }) {
  const store = useJavaCodeRunner();
  const onExport = () => {
    const payload = {
      starterId: props.starterId,
      activeFile: store.activeFile(),
      files: store.files(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.starterId}-session.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={onExport}
      class="rounded border border-background-offset px-2 py-0.5 text-[11px] hover:bg-background-offset"
    >
      Export
    </button>
  );
}
