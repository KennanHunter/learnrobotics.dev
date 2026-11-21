import { onCleanup } from "solid-js";
import {
  EventDispatcher,
  NullFileSink,
  ReplayEngine,
  type ReplayEvent,
} from "@learnrobotics/events";
import { createAudioClock } from "./AudioClock";
import { bindAudioToEngine } from "./audio-plumbing";
import type { ReplayController } from "./useReplayHost";

export type ReadingReplayHost = ReplayController & {
  /** Fire-forwards every highlight / highlight-clear the engine emits.
   * Hand this to `<HighlightOverlay dispatcher={...}>`. */
  overlayDispatcher: EventDispatcher;
};

/**
 * Replay host for reading-lesson recordings. No editor — just an audio clock
 * driving the engine, which re-emits highlight / highlight-clear events
 * through a fresh dispatcher that HighlightOverlay subscribes to.
 */
export function createReadingReplayHost(params: {
  events: readonly ReplayEvent[];
  audio: HTMLAudioElement;
}): ReadingReplayHost {
  const { events, audio } = params;
  const overlayDispatcher = new EventDispatcher();
  overlayDispatcher.setTrace(false);
  const sink = new NullFileSink();
  const clock = createAudioClock(audio);
  onCleanup(() => clock.dispose());
  const engine = new ReplayEngine({
    events,
    sink,
    clock,
    onHighlight: (e) => overlayDispatcher.emit(e),
    onHighlightClear: (e) => overlayDispatcher.emit(e),
  });
  const controller = bindAudioToEngine(audio, engine);
  return { ...controller, overlayDispatcher };
}
