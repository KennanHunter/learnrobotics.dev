import {
  createSignal,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { ReplayEvent } from "@learnrobotics/events";
import type { MonacoEditorProps } from "../../CodeEditor";
import { createReplayHost, type ReplayController } from "../../replay";

export type ReplayEditorPaneProps = {
  events: readonly ReplayEvent[];
  audioUrl: string;
  monacoTheme: () => string;
  tabSize: () => number;
  registerThemes?: MonacoEditorProps["registerThemes"];
  /** Fires once the host is constructed and bound to the editor + audio. */
  onReady?: (controller: ReplayController) => void;
  loadingLabel?: string;
};

/**
 * Readonly Monaco editor driven by the ReplayEngine. The pane owns the
 * hidden <audio> element whose timeupdate is the engine's clock.
 */
export function ReplayEditorPane(props: ReplayEditorPaneProps) {
  const [Editor, setEditor] = createSignal<Component<MonacoEditorProps> | null>(
    null,
  );
  let audioEl!: HTMLAudioElement;

  onMount(async () => {
    try {
      const mod = await import("../../CodeEditor");
      setEditor(() => mod.MonacoEditor);
    } catch (err) {
      console.error("[ReplayEditorPane] import failed", err);
    }
  });

  // The initial file + language come from the first event (init). We pick
  // the active file so Monaco mounts against a sensible path from the start;
  // subsequent file switches go through MonacoFileSink.
  const initEvent = () => {
    const first = props.events[0];
    if (!first || first.type !== "init") return null;
    return first;
  };

  const initialPath = () => initEvent()?.activeFile ?? "Replay.java";
  const initialValue = () => {
    const init = initEvent();
    if (!init) return "";
    return init.files[init.activeFile] ?? "";
  };

  function languageOf(path: string): string {
    if (path.endsWith(".java")) return "java";
    if (path.endsWith(".md")) return "markdown";
    if (path.endsWith(".json")) return "json";
    return "plaintext";
  }

  return (
    <div class="relative flex h-full w-full flex-col">
      <Show
        when={Editor()}
        fallback={
          <div class="p-3 text-xs text-foreground-muted">
            {props.loadingLabel ?? "Loading replay…"}
          </div>
        }
      >
        <Dynamic
          component={Editor()!}
          language={languageOf(initialPath())}
          value={initialValue()}
          theme={props.monacoTheme()}
          path={`replay://${initialPath()}`}
          registerThemes={props.registerThemes}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            tabSize: props.tabSize(),
            insertSpaces: true,
            domReadOnly: true,
          }}
          onMount={(monaco, editor) => {
            // Replay models live under a separate URI scheme so they don't
            // collide with the student's live models.
            const controller = createReplayHost({
              events: props.events,
              monaco,
              editor,
              audio: audioEl,
            });
            props.onReady?.(controller);
          }}
        />
      </Show>
      <audio ref={audioEl} src={props.audioUrl} preload="auto" class="hidden" />
    </div>
  );
}
