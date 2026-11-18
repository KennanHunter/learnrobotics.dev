import { type JSX } from "solid-js";
import { CodeRunnerShell } from "../../Panels/CodeRunnerShell";
import { PanelFrame } from "../../Panels/PanelFrame";
import type { MonacoEditorProps } from "../../CodeEditor";
import { useMarkdownRunner } from "./markdown-store";
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
  const store = useMarkdownRunner();
  const L = () => props.labels ?? {};

  const toolbarSlot = () => (
    <PanelFrame bare>
      <div class="flex h-full min-h-0 items-center gap-3 px-3">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          {props.toolbarLeft?.()}
        </div>
        <button
          type="button"
          onClick={store.renderNow}
          class="rounded bg-primary px-3 py-1 text-xs font-medium text-background hover:opacity-80"
        >
          {L().run ?? "Run"}
        </button>
        <div class="flex shrink-0 items-center gap-2">
          {props.toolbarRight?.()}
        </div>
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
