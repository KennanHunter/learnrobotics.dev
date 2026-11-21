import { describe, it, expect } from "vitest";
import {
  ManualClock,
  PlainFileSink,
  ReplayEngine,
  type ReplayEvent,
} from "../src/index";

function makeStream(): ReplayEvent[] {
  const edit = (t: number, text: string): ReplayEvent => ({
    t,
    type: "edit",
    file: "Main.java",
    changes: [
      {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        },
        text,
      },
    ],
  });
  return [
    { t: 0, type: "init", files: { "Main.java": "" }, activeFile: "Main.java" },
    edit(100, "a"),
    edit(200, "b"),
    edit(300, "c"),
    { t: 400, type: "auto-pause", resumeOn: "button" },
    edit(500, "d"),
  ];
}

describe("ReplayEngine", () => {
  it("applies init on construction", () => {
    const events = makeStream();
    const sink = new PlainFileSink();
    const clock = new ManualClock();
    new ReplayEngine({ events, sink, clock });
    expect(sink.snapshotFiles()).toEqual({ "Main.java": "" });
    expect(sink.getActiveFile()).toEqual("Main.java");
  });

  it("seeks forward via clock subscription", () => {
    const events = makeStream();
    const sink = new PlainFileSink();
    const clock = new ManualClock();
    new ReplayEngine({ events, sink, clock });
    clock.set(250);
    expect(sink.snapshotFiles()["Main.java"]).toEqual("ba");
  });

  it("stops at auto-pause and reports via onPauseChange", () => {
    const events = makeStream();
    const sink = new PlainFileSink();
    const clock = new ManualClock();
    const engine = new ReplayEngine({ events, sink, clock });
    let pausedState: { paused: boolean; reason: string | null } | null = null;
    engine.onPauseChange((p, reason) => {
      pausedState = { paused: p, reason };
    });
    clock.set(600);
    expect(pausedState).toEqual({ paused: true, reason: "auto-pause" });
    expect(sink.snapshotFiles()["Main.java"]).toEqual("cba");
    expect(engine.isPaused()).toBe(true);
  });

  it("resume + seek past auto-pause continues applying", () => {
    const events = makeStream();
    const sink = new PlainFileSink();
    const clock = new ManualClock();
    const engine = new ReplayEngine({ events, sink, clock });
    clock.set(600);
    expect(engine.isPaused()).toBe(true);
    engine.resume();
    clock.set(600);
    expect(sink.snapshotFiles()["Main.java"]).toEqual("dcba");
  });

  it("backward seek restores and re-applies correctly", () => {
    const events = makeStream();
    const sink = new PlainFileSink();
    const clock = new ManualClock();
    new ReplayEngine({ events, sink, clock });
    clock.set(300);
    expect(sink.snapshotFiles()["Main.java"]).toEqual("cba");
    clock.set(150);
    expect(sink.snapshotFiles()["Main.java"]).toEqual("a");
  });

  it("onEnd fires exactly once when seeking past the last event", () => {
    const events = makeStream();
    const sink = new PlainFileSink();
    const clock = new ManualClock();
    const engine = new ReplayEngine({ events, sink, clock });
    let ends = 0;
    engine.onEnd(() => ends++);
    clock.set(600);
    engine.resume();
    clock.set(600);
    clock.set(700);
    expect(ends).toBe(1);
  });

  it("pauses the recording dispatcher while applying", () => {
    const events = makeStream();
    const sink = new PlainFileSink();
    const clock = new ManualClock();
    let pauseCalls = 0;
    let resumeCalls = 0;
    const recorderStub = {
      pause: () => {
        pauseCalls++;
      },
      resume: () => {
        resumeCalls++;
      },
      isPaused: () => false,
    };
    new ReplayEngine({
      events,
      sink,
      clock,
      recordingDispatcher: recorderStub,
    });
    // Ctor applies init under pause.
    expect(pauseCalls).toBeGreaterThan(0);
    expect(pauseCalls).toEqual(resumeCalls);
  });
});
