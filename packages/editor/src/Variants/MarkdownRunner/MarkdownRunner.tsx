import { Show, type JSX } from "solid-js";
import { CodeRunnerShell } from "../../Panels/CodeRunnerShell";
import { PanelFrame } from "../../Panels/PanelFrame";
import { ReplayControls } from "../../Panels/ReplayControls";
import type { MonacoEditorProps } from "../../CodeEditor";
import { MarkdownEditorPane } from "./MarkdownEditorPane";
import { MarkdownPreviewPane } from "./MarkdownPreviewPane";

export type MarkdownRunnerProps = {
  monacoTheme: () => string;
  registerThemes?: MonacoEditorProps["registerThemes"];
  /** Optional article pane on the far left (prose for lesson authors). */
  articleSlot?: () => JSX.Element;
  toolbarLeft?: () => JSX.Element;
  toolbarRight?: () => JSX.Element;
  labels?: {
    article?: string;
    editor?: string;
    preview?: string;
    run?: string;
    loadingEditor?: string;
  };
};

export function MarkdownRunner(props: MarkdownRunnerProps) {
  const L = () => props.labels ?? {};

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

  return (
    <CodeRunnerShell
      toolbarSlot={toolbarSlot}
      articleSlot={props.articleSlot}
      editorSlot={() => (
        <MarkdownEditorPane
          monacoTheme={props.monacoTheme}
          registerThemes={props.registerThemes}
          loadingLabel={L().loadingEditor}
        />
      )}
      rightSlot={() => <MarkdownPreviewPane />}
      articleTitle={L().article ?? "Lesson"}
      editorTitle={L().editor ?? "document.md"}
      rightTitle={L().preview ?? "Preview"}
    />
  );
}
