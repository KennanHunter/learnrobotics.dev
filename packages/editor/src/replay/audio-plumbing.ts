import { createSignal, onCleanup, type Accessor } from "solid-js";
import type { ReplayEngine } from "@learnrobotics/events";

export type AudioBindings = {
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

/**
 * Wires an <audio> element's lifecycle events into Solid signals, pauses the
 * audio when the engine hits an auto-pause, and exposes play/seek/volume
 * controls. Shared by the Monaco-backed and reading-backed replay hosts.
 */
export function bindAudioToEngine(
  audio: HTMLAudioElement,
  engine: ReplayEngine,
): AudioBindings {
  const [playing, setPlaying] = createSignal(false);
  const [currentMs, setCurrentMs] = createSignal(0);
  const [durationMs, setDurationMs] = createSignal(engine.durationMs());
  const [volume, setVolumeSig] = createSignal(audio.volume);
  const [autoPaused, setAutoPaused] = createSignal(false);

  const engineDuration = engine.durationMs();

  // `timeupdate` only fires ~4 Hz, so the scrubber would stutter if it were
  // our only source. Poll on requestAnimationFrame while playing so the
  // scrubber stays smooth.
  let rafId: number | null = null;
  const pollTime = () => {
    rafId = null;
    setCurrentMs(audio.currentTime * 1000);
    if (!audio.paused) {
      rafId = requestAnimationFrame(pollTime);
    }
  };

  const onTime = () => setCurrentMs(audio.currentTime * 1000);
  const onPlayEv = () => {
    setPlaying(true);
    if (rafId === null) rafId = requestAnimationFrame(pollTime);
  };
  const onPauseEv = () => {
    setPlaying(false);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    setCurrentMs(audio.currentTime * 1000);
  };
  const onEndedEv = () => {
    setPlaying(false);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
  const onDurationChange = () => {
    if (isFinite(audio.duration)) {
      setDurationMs(Math.max(engineDuration, audio.duration * 1000));
    }
  };
  const onVolume = () => setVolumeSig(audio.volume);

  audio.addEventListener("timeupdate", onTime);
  audio.addEventListener("seeking", onTime);
  audio.addEventListener("seeked", onTime);
  audio.addEventListener("play", onPlayEv);
  audio.addEventListener("pause", onPauseEv);
  audio.addEventListener("ended", onEndedEv);
  audio.addEventListener("durationchange", onDurationChange);
  audio.addEventListener("volumechange", onVolume);

  const pauseUnsub = engine.onPauseChange((paused, reason) => {
    setAutoPaused(paused && reason === "auto-pause");
    if (paused && reason === "auto-pause") {
      audio.pause();
    }
  });

  onCleanup(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    audio.removeEventListener("timeupdate", onTime);
    audio.removeEventListener("seeking", onTime);
    audio.removeEventListener("seeked", onTime);
    audio.removeEventListener("play", onPlayEv);
    audio.removeEventListener("pause", onPauseEv);
    audio.removeEventListener("ended", onEndedEv);
    audio.removeEventListener("durationchange", onDurationChange);
    audio.removeEventListener("volumechange", onVolume);
    pauseUnsub();
    engine.stop();
  });

  return {
    playing,
    currentMs,
    durationMs,
    volume,
    autoPaused,
    play: async () => {
      await audio.play();
    },
    pause: () => {
      audio.pause();
    },
    seek: (ms: number) => {
      audio.currentTime = Math.max(0, ms / 1000);
    },
    setVolume: (v: number) => {
      audio.volume = Math.max(0, Math.min(1, v));
    },
    resume: () => {
      engine.resume();
      setAutoPaused(false);
    },
  };
}
