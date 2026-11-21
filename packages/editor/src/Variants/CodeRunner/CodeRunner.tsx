import { Show, type JSX } from "solid-js";
import type { EventDispatcher } from "@learnrobotics/events";
import { CodeRunnerShell } from "../../Panels/CodeRunnerShell";
import { PanelFrame } from "../../Panels/PanelFrame";
import { ReplayControls } from "../../Panels/ReplayControls";
import { TabGroup, type TabDef } from "../../Panels/TabGroup";
import type { MonacoEditorProps } from "../../CodeEditor";
import { FormatButton, type FormatLanguage } from "../../Shared/Format";
import { MarkdownPreview } from "../../Shared/MarkdownPreview";
import { useCodeRunner, type ConsoleTab } from "./code-runner-store";
import { CodeEditorPane } from "./CodeEditorPane";
import { StdoutPane } from "./panes/StdoutPane";
import { CompilePane } from "./panes/CompilePane";
import { DepsPane } from "./panes/DepsPane";

export type CodeRunnerProps = {
  monacoTheme: () => string;
  tabSize: () => number;
  registerThemes?: MonacoEditorProps["registerThemes"];
  dispatcher?: EventDispatcher;
  articleSlot?: () => JSX.Element;
  /** When true, hides the article panel's title header (the slot owns it). */
  articleBare?: boolean;
  /** Left content in the top toolbar (title, back link, breadcrumb, etc.).
   * Function-form so JSX creation is deferred until the shell's mount gate
   * opens — otherwise solid-refresh memo-wrapping assigns a hydration key
   * to eagerly-instantiated JSX and crashes hydration. */
  toolbarLeft?: () => JSX.Element;
  toolbarRight?: () => JSX.Element;
  /** Right-aligned content in the editor panel header. Function-form for
   * the same hydration-key reason as the toolbar slots. */
  editorActions?: () => JSX.Element;
  /** Rendered before the editor panel's title (e.g. a sidebar-toggle
   * button). Function-form for the same hydration-key reason. */
  editorTitleLeading?: () => JSX.Element;
  /** Right-aligned content in the files panel header (e.g. a close
   * button). Function-form for the same hydration-key reason. */
  filesActions?: () => JSX.Element;
  /** Opt-in files panel (e.g. the tree component in the web app). When
   * omitted the files column is hidden entirely. Function-form so JSX
   * creation defers until the shell's client-only mount gate opens. */
  filesSlot?: () => JSX.Element;
  labels?: {
    article?: string;
    files?: string;
    editor?: string;
    console?: string;
    preview?: string;
    stdoutTab?: string;
    compileTab?: string;
    depsTab?: string;
    run?: string;
    stop?: string;
    downloading?: string;
    retry?: string;
    compiling?: string;
    running?: string;
    loadingEditor?: string;
  };
};

/**
 * Whether the active file should drive the Java toolchain UI (Run button,
 * stdout/compile/deps tabs) or the Markdown preview UI. Any file whose
 * contents can't be fed to javac goes through the preview branch.
 */
function activeFileMode(path: string): "java" | "markdown" {
  return path.endsWith(".md") ? "markdown" : "java";
}

export function CodeRunner(props: CodeRunnerProps) {
  const store = useCodeRunner();
  const L = () => props.labels ?? {};

  const tabs = (): TabDef[] => [
    {
      id: "stdout",
      label: L().stdoutTab ?? "Output",
      badge: store.tabBadges().stdout,
      content: <StdoutPane />,
    },
    {
      id: "compile",
      label: L().compileTab ?? "Compile",
      badge: store.tabBadges().compile,
      content: <CompilePane />,
    },
    {
      id: "deps",
      label: L().depsTab ?? "Deps",
      badge: store.tabBadges().deps,
      content: <DepsPane />,
    },
  ];

  const isRunning = () =>
    store.runState() === "compiling" || store.runState() === "running";

  const runLabel = () => {
    const l = L();
    if (store.runState() === "compiling") {
      return `${l.stop ?? "Stop"} · ${l.compiling ?? "Compiling…"}`;
    }
    if (store.runState() === "running") {
      const running = l.running ?? "Running";
      return `${l.stop ?? "Stop"} · ${running} ${store.runElapsedSeconds()}s`;
    }
    return l.run ?? "Run";
  };

  const formatLanguageOf = (path: string): FormatLanguage | null => {
    if (path.endsWith(".java")) return "java";
    if (path.endsWith(".md")) return "markdown";
    return null;
  };

  const mode = () => activeFileMode(store.activeFile());

  const toolbarSlot = () => (
    <PanelFrame bare>
      <div class="flex h-full min-h-0 items-stretch">
        <div class="flex min-w-0 flex-1 items-center gap-3 border-r border-background-offset px-4 py-2">
          {props.toolbarLeft?.()}
        </div>
        <div class="flex shrink-0 items-center gap-3 px-4 py-2">
          <Show when={formatLanguageOf(store.activeFile())}>
            {(lang) => (
              <FormatButton
                language={lang()}
                tabSize={props.tabSize}
                getValue={() => store.source()}
                setValue={(next) => store.setSource(next)}
              />
            )}
          </Show>
          <Show when={mode() === "java"}>
            <button
              type="button"
              data-testid="playground-run"
              data-phase={store.runState()}
              disabled={!isRunning() && store.isBusy()}
              onClick={() => (isRunning() ? store.onStop() : store.onRun())}
              classList={{
                "inline-flex items-center gap-1.5 rounded border border-background-offset px-3 py-1 text-xs font-medium text-background shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60":
                  true,
                "bg-primary hover:bg-primary/90": !isRunning(),
                "bg-red-500 hover:bg-red-500/90": isRunning(),
              }}
            >
              {runLabel()}
            </button>
          </Show>
          <ReplayControls />
        </div>
        <Show when={props.toolbarRight}>
          <div class="flex shrink-0 items-center gap-2 border-l border-background-offset px-4 py-2">
            {props.toolbarRight!()}
          </div>
        </Show>
      </div>
    </PanelFrame>
  );

  return (
    <CodeRunnerShell
      toolbarSlot={toolbarSlot}
      articleSlot={props.articleSlot}
      articleBare={props.articleBare}
      filesSlot={props.filesSlot}
      editorSlot={() => (
        <CodeEditorPane
          monacoTheme={props.monacoTheme}
          tabSize={props.tabSize}
          registerThemes={props.registerThemes}
          dispatcher={props.dispatcher}
          loadingLabel={L().loadingEditor}
        />
      )}
      rightSlot={() =>
        mode() === "markdown" ? (
          <MarkdownPreview source={() => store.source()} />
        ) : (
          <TabGroup
            tabs={tabs()}
            active={store.activeConsoleTab()}
            onChange={(id) => store.setActiveConsoleTab(id as ConsoleTab)}
          />
        )
      }
      articleTitle={L().article ?? "Lesson"}
      filesTitle={L().files ?? "Files"}
      filesActions={props.filesActions}
      editorTitle={store.activeFile() || (L().editor ?? "Editor")}
      editorTitleLeading={props.editorTitleLeading}
      editorActions={props.editorActions}
      rightTitle={
        mode() === "markdown"
          ? (L().preview ?? "Preview")
          : (L().console ?? "Console")
      }
    />
  );
}
