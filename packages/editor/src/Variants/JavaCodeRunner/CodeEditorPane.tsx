import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { bindRecorder } from "../../CodeEditor/bind-recorder";
import { getOrCreateModel } from "../../CodeEditor/utils";
import type { EventDispatcher } from "@learnrobotics/events";
import type { MonacoEditorProps } from "../../CodeEditor";
import { useJavaCodeRunner } from "./playground-store";

export type CodeEditorPaneProps = {
  monacoTheme: () => string;
  registerThemes?: MonacoEditorProps["registerThemes"];
  dispatcher?: EventDispatcher;
  loadingLabel?: string;
};

export function CodeEditorPane(props: CodeEditorPaneProps) {
  console.log("[CodeEditorPane] body");
  const store = useJavaCodeRunner();
  console.log("[CodeEditorPane] store ok", {
    activeFile: store.activeFile(),
    sourceLength: store.source()?.length,
  });
  const [Editor, setEditor] = createSignal<Component<MonacoEditorProps> | null>(
    null,
  );
  const [valueProp, setValueProp] = createSignal<string | undefined>(
    store.source(),
  );
  let unbindRecorder: (() => void) | undefined;

  onMount(async () => {
    console.log("[CodeEditorPane] onMount: importing CodeEditor");
    try {
      const mod = await import("../../CodeEditor");
      console.log("[CodeEditorPane] module loaded", {
        hasMonacoEditor: Boolean(mod.MonacoEditor),
      });
      setEditor(() => mod.MonacoEditor);
    } catch (err) {
      console.error("[CodeEditorPane] import failed", err);
    }
  });

  onCleanup(() => {
    unbindRecorder?.();
  });

  function languageOf(path: string): string {
    if (path.endsWith(".java")) return "java";
    if (path.endsWith(".md")) return "markdown";
    if (path.endsWith(".json")) return "json";
    return "plaintext";
  }

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
        language={languageOf(store.activeFile())}
        value={valueProp()}
        theme={props.monacoTheme()}
        path={store.activeFile()}
        registerThemes={props.registerThemes}
        onChange={(val: string) => store.setSource(val)}
        onMount={(m, ed) => {
          // Pre-populate a model per file so later path switches reuse
          // models with the right contents.
          for (const [path, content] of Object.entries(store.files())) {
            getOrCreateModel(m, content, languageOf(path), path);
          }
          setValueProp(undefined);
          unbindRecorder?.();
          if (props.dispatcher) {
            unbindRecorder = bindRecorder(ed, props.dispatcher, {
              fileOf: () => store.activeFile(),
            });
          }
        }}
        options={{ minimap: { enabled: false }, fontSize: 13 }}
      />
    </Show>
  );
}
