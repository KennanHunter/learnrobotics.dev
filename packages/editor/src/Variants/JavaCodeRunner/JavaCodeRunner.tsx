import { Show, type JSX } from "solid-js";
import type { EventDispatcher } from "@learnrobotics/events";
import { CodeRunnerShell } from "../../Panels/CodeRunnerShell";
import { PanelFrame } from "../../Panels/PanelFrame";
import { ReplayControls } from "../../Panels/ReplayControls";
import { TabGroup, type TabDef } from "../../Panels/TabGroup";
import type { MonacoEditorProps } from "../../CodeEditor";
import { useJavaCodeRunner, type ConsoleTab } from "./playground-store";
import { CodeEditorPane } from "./CodeEditorPane";
import { FilesPane } from "./FilesPane";
import { StdoutPane } from "./panes/StdoutPane";
import { CompilePane } from "./panes/CompilePane";
import { DepsPane } from "./panes/DepsPane";

export type JavaCodeRunnerProps = {
  monacoTheme: () => string;
  registerThemes?: MonacoEditorProps["registerThemes"];
  dispatcher?: EventDispatcher;
  articleSlot?: () => JSX.Element;
  /** Left content in the top toolbar (title, back link, breadcrumb, etc.).
   * Function-form so JSX creation is deferred until the shell's mount gate
   * opens — otherwise solid-refresh memo-wrapping assigns a hydration key
   * to eagerly-instantiated JSX and crashes hydration. */
  toolbarLeft?: () => JSX.Element;
  toolbarRight?: () => JSX.Element;
  labels?: {
    article?: string;
    files?: string;
    editor?: string;
    console?: string;
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

export function JavaCodeRunner(props: JavaCodeRunnerProps) {
  const store = useJavaCodeRunner();
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

  const toolbarSlot = () => (
    <PanelFrame bare>
      <div class="flex h-full min-h-0 items-stretch">
        <div class="flex min-w-0 flex-1 items-center gap-3 border-r border-background-offset px-4 py-2">
          {props.toolbarLeft?.()}
        </div>
        <div class="flex shrink-0 items-center gap-3 px-4 py-2">
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

  const multiFile = () => Object.keys(store.files()).length > 1;

  return (
    <CodeRunnerShell
      toolbarSlot={toolbarSlot}
      articleSlot={props.articleSlot}
      filesSlot={multiFile() ? () => <FilesPane /> : undefined}
      editorSlot={() => (
        <CodeEditorPane
          monacoTheme={props.monacoTheme}
          registerThemes={props.registerThemes}
          dispatcher={props.dispatcher}
          loadingLabel={L().loadingEditor}
        />
      )}
      rightSlot={() => (
        <TabGroup
          tabs={tabs()}
          active={store.activeConsoleTab()}
          onChange={(id) => store.setActiveConsoleTab(id as ConsoleTab)}
        />
      )}
      articleTitle={L().article ?? "Lesson"}
      filesTitle={L().files ?? "Files"}
      editorTitle={store.activeFile() || (L().editor ?? "Editor")}
      rightTitle={L().console ?? "Console"}
    />
  );
}
