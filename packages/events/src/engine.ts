import type { Clock } from "./clock";
import type { Disposer, EventDispatcher } from "./dispatcher";
import type { ReplayEvent } from "./schema";
import {
  applyEventToSink,
  buildSnapshots,
  resolveSeek,
  type FileSink,
  type Snapshot,
  type BuildSnapshotsOptions,
} from "./snapshots";

export type ReplayEngineOptions = {
  events: readonly ReplayEvent[];
  sink: FileSink;
  clock: Clock;
  /** Optional recording dispatcher that must be paused while the engine
   * applies events — prevents bind-recorder from re-capturing replayed edits. */
  recordingDispatcher?: Pick<EventDispatcher, "pause" | "resume" | "isPaused">;
  /** Optional overlay hook — fires on highlight events as the engine seeks. */
  onHighlight?: (event: Extract<ReplayEvent, { type: "highlight" }>) => void;
  /** Fires on highlight-clear events. */
  onHighlightClear?: (
    event: Extract<ReplayEvent, { type: "highlight-clear" }>,
  ) => void;
  snapshotOptions?: BuildSnapshotsOptions;
};

export type PauseReason = "auto-pause" | "manual" | "end";

/**
 * Clock-decoupled replay engine. Subscribes to a Clock and applies events
 * forward through a FileSink. Snapshots short-circuit long backward jumps.
 */
export class ReplayEngine {
  private readonly events: readonly ReplayEvent[];
  private readonly snapshots: Snapshot[];
  private readonly sink: FileSink;
  private readonly clock: Clock;
  private readonly recordingDispatcher?: ReplayEngineOptions["recordingDispatcher"];
  private readonly onHighlight?: ReplayEngineOptions["onHighlight"];
  private readonly onHighlightClear?: ReplayEngineOptions["onHighlightClear"];

  private currentIndex = -1;
  private paused = false;
  private pauseReason: PauseReason | null = null;
  private clockUnsub: Disposer | null = null;
  private pauseCbs = new Set<(paused: boolean, reason: PauseReason | null) => void>();
  private endCbs = new Set<() => void>();
  private endFired = false;
  private pendingAutoPauseResume: "edit" | "button" | null = null;

  constructor(opts: ReplayEngineOptions) {
    this.events = opts.events;
    this.sink = opts.sink;
    this.clock = opts.clock;
    this.recordingDispatcher = opts.recordingDispatcher;
    this.onHighlight = opts.onHighlight;
    this.onHighlightClear = opts.onHighlightClear;
    this.snapshots = buildSnapshots(opts.events, opts.snapshotOptions);
    // Apply init immediately so the sink has valid state before the first seek.
    if (opts.events.length > 0 && opts.events[0].type === "init") {
      this.withRecordingPaused(() => {
        applyEventToSink(this.sink, this.events[0]);
      });
      this.currentIndex = 0;
    }
    this.clockUnsub = this.clock.subscribe((t) => this.onClockTick(t));
  }

  /** Total duration of the recording (t of the last event). */
  durationMs(): number {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1].t;
  }

  currentMs(): number {
    if (this.currentIndex < 0) return 0;
    return this.events[this.currentIndex].t;
  }

  isPaused(): boolean {
    return this.paused;
  }

  autoPauseResumeOn(): "edit" | "button" | null {
    return this.pendingAutoPauseResume;
  }

  onPauseChange(fn: (paused: boolean, reason: PauseReason | null) => void): Disposer {
    this.pauseCbs.add(fn);
    return () => {
      this.pauseCbs.delete(fn);
    };
  }

  onEnd(fn: () => void): Disposer {
    this.endCbs.add(fn);
    return () => {
      this.endCbs.delete(fn);
    };
  }

  /** Seek to the given target time. Applies forward or snapshot-restores
   * backward as needed. Stops at any `auto-pause` event in the apply range. */
  seek(targetMs: number): void {
    if (this.events.length === 0) return;
    const plan = resolveSeek(this.events, this.snapshots, this.currentIndex, targetMs);
    this.withRecordingPaused(() => {
      if (plan.restore) {
        if (plan.restore.kind === "init") {
          applyEventToSink(this.sink, plan.restore.init);
          this.currentIndex = 0;
        } else {
          const snap = plan.restore.snapshot;
          this.sink.replaceAllFiles(snap.files, snap.activeFile);
          this.currentIndex = snap.eventIndex;
        }
      }
      if (plan.applyRange) {
        // Defer highlights so only the last one in a catch-up range fires —
        // earlier ones would be overwritten by it on screen anyway. Filter
        // out any whose active window has already elapsed by the time we
        // flush, and adjust the fired duration to the remaining window so
        // the overlay's wall-clock timer matches the audio timeline.
        let pendingHighlight: Extract<
          ReplayEvent,
          { type: "highlight" }
        > | null = null;
        const flushPending = () => {
          if (!pendingHighlight || !this.onHighlight) {
            pendingHighlight = null;
            return;
          }
          const e = pendingHighlight;
          pendingHighlight = null;
          const dur = e.durationMs ?? 2500;
          const remaining = e.t + dur - this.clock.now();
          if (remaining > 0) {
            this.onHighlight({ ...e, durationMs: remaining });
          }
        };

        for (let i = plan.applyRange.from; i <= plan.applyRange.to; i++) {
          const e = this.events[i];
          if (e.type === "highlight") {
            pendingHighlight = e;
            this.currentIndex = i;
            continue;
          }
          if (e.type === "highlight-clear") {
            pendingHighlight = null;
            this.onHighlightClear?.(e);
            this.currentIndex = i;
            continue;
          }
          if (e.type === "auto-pause") {
            flushPending();
            this.currentIndex = i;
            this.triggerAutoPause(e.resumeOn ?? "button");
            return;
          }
          applyEventToSink(this.sink, e);
          this.currentIndex = i;
        }
        flushPending();
      }
    });
    // End-of-stream detection
    if (
      this.currentIndex === this.events.length - 1 &&
      targetMs >= this.durationMs() &&
      !this.endFired
    ) {
      this.endFired = true;
      for (const cb of this.endCbs) cb();
    }
  }

  /** Clear an auto-pause and continue. Host is responsible for resuming the
   * clock separately — the engine only clears the pause flag and
   * acknowledges forward motion from the current index. */
  resume(): void {
    this.paused = false;
    this.pauseReason = null;
    this.pendingAutoPauseResume = null;
    this.notifyPause();
    // Nudge forward by one tick so the auto-pause event itself is consumed.
    if (this.currentIndex < this.events.length - 1) {
      this.currentIndex = this.currentIndex; // auto-pause already at currentIndex; next seek will advance past it
    }
  }

  pause(): void {
    this.paused = true;
    this.pauseReason = "manual";
    this.notifyPause();
  }

  stop(): void {
    this.clockUnsub?.();
    this.clockUnsub = null;
    this.pauseCbs.clear();
    this.endCbs.clear();
  }

  private onClockTick(t: number): void {
    if (this.paused) return;
    this.seek(t);
  }

  private triggerAutoPause(resumeOn: "edit" | "button"): void {
    this.paused = true;
    this.pauseReason = "auto-pause";
    this.pendingAutoPauseResume = resumeOn;
    this.notifyPause();
  }

  private notifyPause(): void {
    for (const cb of this.pauseCbs) cb(this.paused, this.pauseReason);
  }

  private withRecordingPaused<T>(fn: () => T): T {
    const d = this.recordingDispatcher;
    if (!d) return fn();
    const wasPaused = d.isPaused();
    if (!wasPaused) d.pause();
    try {
      return fn();
    } finally {
      if (!wasPaused) d.resume();
    }
  }
}
