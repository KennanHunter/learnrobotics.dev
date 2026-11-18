import {
  createSignal,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { MonacoEditorProps } from "../../CodeEditor";
import { useMarkdownRunner } from "./markdown-store";

export type MarkdownEditorPaneProps = {
  monacoTheme: () => string;
  registerThemes?: MonacoEditorProps["registerThemes"];
  loadingLabel?: string;
};

export function MarkdownEditorPane(props: MarkdownEditorPaneProps) {
  const store = useMarkdownRunner();
  const [Editor, setEditor] = createSignal<Component<MonacoEditorProps> | null>(
    null,
  );

  onMount(async () => {
    const mod = await import("../../CodeEditor");
    setEditor(() => mod.MonacoEditor);
  });

  return (
    <Show
      when={Editor()}
      fallback={
        <div class="p-3 text-xs text-foreground-muted">
          {props.loadingLabel ?? "Loading editor…"}
        </div>
      }
    >
      <Dynamic
        component={Editor()!}
        language="markdown"
        value={store.source()}
        theme={props.monacoTheme()}
        path="document.md"
        registerThemes={props.registerThemes}
        onChange={(val: string) => store.setSource(val)}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
        }}
      />
    </Show>
  );
}
