import { describe, it, expect } from "vitest";
import {
  ManualClock,
  NullFileSink,
  ReplayEngine,
  type ReplayEvent,
} from "../src/index";

describe("NullFileSink + highlight catch-up semantics", () => {
  it("defers highlights so a trailing clear in a catch-up range wins", () => {
    const events: ReplayEvent[] = [
      { t: 0, type: "init", files: {}, activeFile: "" },
      { t: 100, type: "highlight", target: "mdx:intro" },
      { t: 200, type: "highlight-clear" },
      { t: 300, type: "auto-pause", resumeOn: "button" },
      { t: 400, type: "highlight", target: "mdx:summary", durationMs: 1000 },
    ];
    const highlights: { target: string }[] = [];
    const clears: { t: number }[] = [];
    const clock = new ManualClock();
    const sink = new NullFileSink();
    const engine = new ReplayEngine({
      events,
      sink,
      clock,
      onHighlight: (e) => highlights.push({ target: e.target }),
      onHighlightClear: (e) => clears.push({ t: e.t }),
    });

    // Covers highlight@100 + clear@200 — the clear wins, no highlight fires.
    clock.set(250);
    expect(highlights).toEqual([]);
    expect(clears).toEqual([{ t: 200 }]);
    expect(engine.isPaused()).toBe(false);

    // Hits the auto-pause.
    clock.set(350);
    expect(engine.isPaused()).toBe(true);

    engine.resume();
    // Fires the summary highlight; its window ends at 1400, so still active.
    clock.set(500);
    expect(highlights).toEqual([{ target: "mdx:summary" }]);
  });

  it("skips a highlight whose active window has already elapsed", () => {
    const events: ReplayEvent[] = [
      { t: 0, type: "init", files: {}, activeFile: "" },
      // Active window: 100..1100
      { t: 100, type: "highlight", target: "mdx:stale", durationMs: 1000 },
    ];
    const highlights: { target: string }[] = [];
    const clock = new ManualClock();
    new ReplayEngine({
      events,
      sink: new NullFileSink(),
      clock,
      onHighlight: (e) => highlights.push({ target: e.target }),
    });
    // Audio has run past 1100 — the highlight should not fire.
    clock.set(2000);
    expect(highlights).toEqual([]);
  });

  it("fires the latest highlight with its remaining duration on catch-up", () => {
    const events: ReplayEvent[] = [
      { t: 0, type: "init", files: {}, activeFile: "" },
      // Active 1000..11000 (10s highlight) — would be overridden by the next
      { t: 1000, type: "highlight", target: "mdx:early", durationMs: 10000 },
      // Active 5000..15000 — the one that should actually show
      { t: 5000, type: "highlight", target: "mdx:late", durationMs: 10000 },
    ];
    const fires: { target: string; durationMs: number | undefined }[] = [];
    const clock = new ManualClock();
    new ReplayEngine({
      events,
      sink: new NullFileSink(),
      clock,
      onHighlight: (e) => fires.push({ target: e.target, durationMs: e.durationMs }),
    });
    // rAF "catches up" to 8000 — the late highlight has 7000 ms left.
    clock.set(8000);
    expect(fires).toHaveLength(1);
    expect(fires[0].target).toEqual("mdx:late");
    expect(fires[0].durationMs).toEqual(7000);
  });
});
