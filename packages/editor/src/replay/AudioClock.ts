import type { Clock } from "@learnrobotics/events";

type Disposer = () => void;

/**
 * Clock implementation backed by an <audio> element.
 *
 * The audio element's native `timeupdate` only fires ~4 Hz, which makes the
 * replay engine apply events in visible chunks. Instead we poll
 * `currentTime` on `requestAnimationFrame` while playback is active, and
 * also emit on discrete events (`play`, `pause`, `seeking`, `seeked`) so
 * seeks + pauses are instantaneous.
 *
 * Call `dispose()` when you're done to detach the DOM listeners.
 */
export function createAudioClock(el: HTMLAudioElement): Clock & {
  dispose: Disposer;
} {
  const subscribers = new Set<(t: number) => void>();
  let rafId: number | null = null;

  const emit = () => {
    const t = el.currentTime * 1000;
    for (const fn of subscribers) fn(t);
  };

  const tick = () => {
    rafId = null;
    emit();
    if (!el.paused && subscribers.size > 0) {
      rafId = requestAnimationFrame(tick);
    }
  };

  const startLoop = () => {
    if (rafId === null && subscribers.size > 0) {
      rafId = requestAnimationFrame(tick);
    }
  };
  const stopLoop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const onPlay = () => {
    emit();
    startLoop();
  };
  const onPause = () => {
    stopLoop();
    emit();
  };
  const onSeek = () => {
    emit();
    if (!el.paused) startLoop();
  };

  el.addEventListener("play", onPlay);
  el.addEventListener("pause", onPause);
  el.addEventListener("seeking", onSeek);
  el.addEventListener("seeked", onSeek);

  return {
    now: () => el.currentTime * 1000,
    subscribe(fn: (t: number) => void): Disposer {
      subscribers.add(fn);
      if (!el.paused) startLoop();
      return () => {
        subscribers.delete(fn);
        if (subscribers.size === 0) stopLoop();
      };
    },
    dispose() {
      stopLoop();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("seeking", onSeek);
      el.removeEventListener("seeked", onSeek);
      subscribers.clear();
    },
  };
}
