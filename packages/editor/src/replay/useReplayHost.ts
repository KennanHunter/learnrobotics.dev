import { onCleanup, type Accessor } from "solid-js";
import type { Monaco } from "@monaco-editor/loader";
import type * as monacoEditor from "monaco-editor";
import { ReplayEngine, type ReplayEvent } from "@learnrobotics/events";
import { createAudioClock } from "./AudioClock";
import { MonacoFileSink } from "./MonacoFileSink";
import { bindAudioToEngine } from "./audio-plumbing";

export type ReplayController = {
  playing: Accessor<boolean>;
  currentMs: Accessor<number>;
  durationMs: Accessor<number>;
  volume: Accessor<number>;
  autoPaused: Accessor<boolean>;
  play(): Promise<void>;
  pause(): void;
  seek(ms: number): void;
  setVolume(v: number): void;
  resume(): void;
};

export function createReplayHost(params: {
  events: readonly ReplayEvent[];
  monaco: Monaco;
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  audio: HTMLAudioElement;
}): ReplayController {
  const { events, monaco, editor, audio } = params;
  const sink = new MonacoFileSink(monaco, editor);
  const clock = createAudioClock(audio);
  onCleanup(() => clock.dispose());
  const engine = new ReplayEngine({ events, sink, clock });
  return bindAudioToEngine(audio, engine);
}
