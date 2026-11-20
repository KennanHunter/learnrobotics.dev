import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal, ErrorBoundary, onMount, Show, untrack } from "solid-js";
import type { ProjectRecord } from "@learnrobotics/db";
import * as v from "valibot";
import { TopBar } from "~/components/TopBar/TopBar";
import { EventDispatcher } from "@learnrobotics/events";
import {
  CodeRunner,
  CodeRunnerProvider,
  useCodeRunner,
} from "@learnrobotics/editor/variants/code-runner";
import { autoThemeFor, registerThemes } from "~/lib/monaco-themes";
import { useTabSize, useTheme } from "@learnrobotics/db";
import { m } from "~/paraglide/messages";
import { resolveStarter } from "~/lib/starters";
import {
  StarterPicker,
  ProjectPersist,
  DRAFT_STORAGE_PREFIX,
} from "~/components/StarterPicker";
import { createCodeRunnerWorker } from "~/workers/create-code-runner-worker";
import { getUserProject } from "~/server/projects";
import { AutosaveIndicator } from "~/components/AutosaveIndicator";
import { ProjectFilesPanel } from "~/components/ProjectFilesPanel";
import { EditorActionsMenu } from "~/components/EditorActionsMenu";

const SearchSchema = v.object({
  s: v.optional(v.string()),
  project: v.optional(v.string()),
});

export const Route = createFileRoute("/playground")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Playground,
});

type SeededStarter = {
  files: Record<string, string>;
  activeFile: string;
};

function loadLocalDraft(starterId: string): SeededStarter | null {
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
  const monacoThemeName = () => monacoTheme() ?? autoThemeFor(effectiveTheme());
  const tabSize = useTabSize();

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

            // Snapshot URL state at mount — later URL rewrites (e.g. the
            // one ProjectPersist triggers after creating a row) must not
            // remount the workbench and clobber the live Monaco buffer.
            const initialProjectId = untrack(() => search().project ?? null);
            // Client-only fetch so SSR renders the loading fallback and
            // client hydration matches. Mirrors the pattern CodeRunnerShell
            // uses for its own client-only mount gate.
            const [serverProject, setServerProject] =
              createSignal<ProjectRecord | null>(null);
            const [loading, setLoading] = createSignal(
              initialProjectId !== null,
            );
            onMount(async () => {
              if (!initialProjectId) return;
              try {
                const row = await getUserProject({
                  data: { id: initialProjectId },
                });
                setServerProject(row);
              } catch {
                /* fall back to starter/local draft */
              } finally {
                setLoading(false);
              }
            });

            return (
              <Show
                when={!loading()}
                fallback={
                  <div class="p-6 text-sm text-foreground-muted">
                    Loading project…
                  </div>
                }
              >
                <Workbench
                  resolved={resolved}
                  initialProjectId={initialProjectId}
                  initialSeed={
                    serverProject()
                      ? {
                          files: serverProject()!.files,
                          activeFile: serverProject()!.activeFile,
                        }
                      : (loadLocalDraft(resolved.id) ?? {
                          files: resolved.files,
                          activeFile: resolved.activeFile,
                        })
                  }
                  monacoThemeName={monacoThemeName}
                  tabSize={tabSize}
                  navigate={navigate}
                />
              </Show>
            );
          }}
        </Show>
      </main>
    </>
  );
}

function Workbench(props: {
  resolved: ReturnType<typeof resolveStarter> & {};
  initialProjectId: string | null;
  initialSeed: SeededStarter;
  monacoThemeName: () => string;
  tabSize: () => number;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const dispatcher = new EventDispatcher();
  const [savedAt, setSavedAt] = createSignal<number | null>(null);
  const [dirtyAt, setDirtyAt] = createSignal<number | null>(null);
  const [projectId, setProjectId] = createSignal<string | null>(
    props.initialProjectId,
  );

  const onCreated = (id: string) => {
    setProjectId(id);
    props.navigate({
      to: "/playground",
      search: { s: props.resolved.id, project: id },
      replace: true,
    });
  };

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
      <CodeRunnerProvider
        starter={props.initialSeed}
        createWorker={createCodeRunnerWorker}
      >
        <ProjectPersist
          starterId={props.resolved.id}
          starterTitle={props.resolved.title}
          projectId={projectId()}
          onCreated={onCreated}
          onSaved={setSavedAt}
          onDirty={setDirtyAt}
        />
        <CodeRunner
          monacoTheme={props.monacoThemeName}
          tabSize={props.tabSize}
          registerThemes={registerThemes}
          dispatcher={dispatcher}
          toolbarLeft={() => (
            <>
              <button
                type="button"
                onClick={() =>
                  props.navigate({ to: "/playground", search: {} })
                }
                class="text-xs text-foreground-muted hover:text-foreground"
              >
                ← All starters
              </button>
              <span class="truncate text-sm font-semibold tracking-tight">
                {props.resolved.title}
              </span>
            </>
          )}
          toolbarRight={() => <ExportButton starterId={props.resolved.id} />}
          editorActions={() => (
            <>
              <AutosaveIndicator savedAt={savedAt()} dirtyAt={dirtyAt()} />
              <EditorActionsMenu starter={props.resolved} />
            </>
          )}
          filesSlot={() => <ProjectFilesPanel />}
          labels={{
            run: m.playground_run(),
            compiling: m.playground_compiling(),
            running: m.playground_running(),
            loadingEditor: m.playground_loading_editor(),
          }}
        />
      </CodeRunnerProvider>
    </ErrorBoundary>
  );
}

function ExportButton(props: { starterId: string }) {
  const store = useCodeRunner();
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
