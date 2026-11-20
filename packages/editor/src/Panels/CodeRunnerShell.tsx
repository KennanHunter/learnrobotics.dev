import { createSignal, onMount, Show, type JSX } from "solid-js";
import { PanelFrame } from "./PanelFrame";

export type CodeRunnerShellProps = {
  /** Top row, spans full width. Rendered flush — no outer padding. */
  toolbarSlot?: () => JSX.Element;
  articleSlot?: () => JSX.Element;
  filesSlot?: () => JSX.Element;
  editorSlot: () => JSX.Element;
  rightSlot: () => JSX.Element;

  articleTitle?: string;
  filesTitle?: string;
  editorTitle?: string;
  /** Right-aligned content in the editor panel header. */
  editorActions?: () => JSX.Element;
  rightTitle?: string;

  /** Hide the article panel's title header. Pass true when the article slot
   * already provides its own section header (e.g. a TabGroup tablist). */
  articleBare?: boolean;

  /** Column widths (`fr` units). Defaults chosen by which slots are present. */
  columns?: {
    article?: number;
    files?: number;
    editor?: number;
    right?: number;
  };
};

export function CodeRunnerShell(props: CodeRunnerShellProps) {
  console.log("[CodeRunnerShell] body", {
    hasToolbar: Boolean(props.toolbarSlot),
    hasArticle: Boolean(props.articleSlot),
    hasFiles: Boolean(props.filesSlot),
  });
  const [mounted, setMounted] = createSignal(false);
  onMount(() => {
    console.log("[CodeRunnerShell] onMount: client-mounting workbench");
    setMounted(true);
  });
  const cols = () => {
    const parts: string[] = [];
    const sizes = resolveSizes(props);
    if (props.articleSlot) parts.push(`${sizes.article}fr`);
    if (props.filesSlot) parts.push(`${sizes.files}fr`);
    parts.push(`${sizes.editor}fr`);
    parts.push(`${sizes.right}fr`);
    return parts.join(" ");
  };

  const gridRows = () => (props.toolbarSlot ? "auto 1fr" : "1fr");

  return (
    <Show
      when={mounted()}
      fallback={
        <div
          data-testid="workbench-loading"
          class="flex h-full w-full items-center justify-center text-xs text-foreground-muted"
        >
          Loading editor…
        </div>
      }
    >
      <div
        data-testid="workbench-root"
        class="grid h-full min-h-0 w-full min-w-0"
        style={{
          "grid-template-rows": gridRows(),
          "grid-template-columns": cols(),
        }}
      >
        <Show when={props.toolbarSlot}>
          <div
            class="min-h-0 min-w-0"
            style={{ "grid-row": "1", "grid-column": "1 / -1" }}
          >
            {props.toolbarSlot!()}
          </div>
        </Show>

        <Show when={props.articleSlot}>
          <div
            class="min-h-0 min-w-0"
            style={{ "grid-row": props.toolbarSlot ? "2" : "1" }}
          >
            <PanelFrame
              title={
                props.articleBare ? undefined : (props.articleTitle ?? "Lesson")
              }
              bare={props.articleBare}
            >
              {props.articleSlot!()}
            </PanelFrame>
          </div>
        </Show>

        <Show when={props.filesSlot}>
          <div
            class="min-h-0 min-w-0"
            style={{ "grid-row": props.toolbarSlot ? "2" : "1" }}
          >
            <PanelFrame title={props.filesTitle ?? "Files"}>
              {props.filesSlot!()}
            </PanelFrame>
          </div>
        </Show>

        <div
          class="min-h-0 min-w-0"
          style={{ "grid-row": props.toolbarSlot ? "2" : "1" }}
        >
          <PanelFrame
            title={props.editorTitle ?? "Editor"}
            actions={props.editorActions?.()}
          >
            {props.editorSlot()}
          </PanelFrame>
        </div>

        <div
          class="min-h-0 min-w-0"
          style={{ "grid-row": props.toolbarSlot ? "2" : "1" }}
        >
          <PanelFrame title={props.rightTitle ?? "Output"}>
            {props.rightSlot()}
          </PanelFrame>
        </div>
      </div>
    </Show>
  );
}

function resolveSizes(props: CodeRunnerShellProps): {
  article: number;
  files: number;
  editor: number;
  right: number;
} {
  const has = {
    article: Boolean(props.articleSlot),
    files: Boolean(props.filesSlot),
  };
  const defaults = (() => {
    if (has.article && has.files)
      return { article: 20, files: 15, editor: 40, right: 25 };
    if (has.article) return { article: 25, files: 0, editor: 50, right: 25 };
    if (has.files) return { article: 0, files: 20, editor: 50, right: 30 };
    return { article: 0, files: 0, editor: 65, right: 35 };
  })();
  return {
    article: props.columns?.article ?? defaults.article,
    files: props.columns?.files ?? defaults.files,
    editor: props.columns?.editor ?? defaults.editor,
    right: props.columns?.right ?? defaults.right,
  };
}
