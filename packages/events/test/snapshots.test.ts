import { describe, it, expect } from "vitest";
import {
  buildSnapshots,
  resolveSeek,
  PlainFileSink,
  applyEventToSink,
  applyChangesToString,
  type ReplayEvent,
} from "../src/index";

function makeStream(): ReplayEvent[] {
  const events: ReplayEvent[] = [
    {
      t: 0,
      type: "init",
      files: { "Main.java": "class Main{}\n", "Other.java": "" },
      activeFile: "Main.java",
    },
  ];
  // Append 500 single-char edits, interleaving the two files.
  for (let i = 0; i < 500; i++) {
    const file = i % 2 === 0 ? "Main.java" : "Other.java";
    events.push({
      t: 10 + i * 5,
      type: "edit",
      file,
      changes: [
        {
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
          text: "x",
        },
      ],
    });
  }
  return events;
}

/** Naive replay: apply events[0..=i] from scratch. Reference for correctness. */
function naiveReplay(events: ReplayEvent[], toIndex: number): Record<string, string> {
  const sink = new PlainFileSink();
  for (let i = 0; i <= toIndex; i++) applyEventToSink(sink, events[i]);
  return sink.snapshotFiles();
}

describe("buildSnapshots + resolveSeek", () => {
  it("snapshots at every N and nothing in between", () => {
    const events = makeStream();
    const snaps = buildSnapshots(events, { everyN: 100 });
    expect(snaps.map((s) => s.eventIndex)).toEqual([100, 200, 300, 400, 500]);
  });

  it("snapshot content matches a naive replay to that index", () => {
    const events = makeStream();
    const snaps = buildSnapshots(events, { everyN: 100 });
    for (const snap of snaps) {
      expect(snap.files).toEqual(naiveReplay(events, snap.eventIndex));
    }
  });

  it("resolveSeek + apply matches naive replay for random targets", () => {
    const events = makeStream();
    const snaps = buildSnapshots(events, { everyN: 100 });
    for (const sample of [25, 150, 320, 475, 500]) {
      const targetMs = events[sample].t;
      const sink = new PlainFileSink();
      const plan = resolveSeek(events, snaps, -1, targetMs);
      if (plan.restore?.kind === "init") {
        applyEventToSink(sink, plan.restore.init);
      } else if (plan.restore?.kind === "snapshot") {
        sink.replaceAllFiles(plan.restore.snapshot.files, plan.restore.snapshot.activeFile);
      }
      if (plan.applyRange) {
        for (let i = plan.applyRange.from; i <= plan.applyRange.to; i++) {
          applyEventToSink(sink, events[i]);
        }
      }
      expect(sink.snapshotFiles()).toEqual(naiveReplay(events, sample));
      expect(plan.targetIndex).toEqual(sample);
    }
  });

  it("forward seek without snapshot hop extends from currentIndex", () => {
    const events = makeStream();
    const snaps = buildSnapshots(events, { everyN: 100 });
    // currentIndex=120 (past snapshot@100) seeking to events[150].t
    const targetMs = events[150].t;
    const plan = resolveSeek(events, snaps, 120, targetMs);
    expect(plan.restore).toBeNull();
    expect(plan.applyRange).toEqual({ from: 121, to: 150 });
  });

  it("backward seek restores from the greatest earlier snapshot", () => {
    const events = makeStream();
    const snaps = buildSnapshots(events, { everyN: 100 });
    const targetMs = events[150].t;
    const plan = resolveSeek(events, snaps, 400, targetMs);
    expect(plan.restore?.kind).toEqual("snapshot");
    if (plan.restore?.kind === "snapshot") {
      expect(plan.restore.snapshot.eventIndex).toEqual(100);
    }
    expect(plan.applyRange).toEqual({ from: 101, to: 150 });
  });

  it("seek before first snapshot restores from init", () => {
    const events = makeStream();
    const snaps = buildSnapshots(events, { everyN: 100 });
    const plan = resolveSeek(events, snaps, 400, events[50].t);
    expect(plan.restore?.kind).toEqual("init");
    expect(plan.applyRange).toEqual({ from: 1, to: 50 });
  });
});

describe("applyChangesToString", () => {
  it("applies an insertion at a given line/column", () => {
    const src = "abc\ndef\n";
    const out = applyChangesToString(src, [
      {
        range: { startLineNumber: 2, startColumn: 2, endLineNumber: 2, endColumn: 2 },
        text: "X",
      },
    ]);
    expect(out).toEqual("abc\ndXef\n");
  });

  it("applies a replacement range", () => {
    const src = "hello world";
    const out = applyChangesToString(src, [
      {
        range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 12 },
        text: "there",
      },
    ]);
    expect(out).toEqual("hello there");
  });

  it("applies multiple non-overlapping changes atomically", () => {
    const src = "abc";
    const out = applyChangesToString(src, [
      {
        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        text: "[",
      },
      {
        range: { startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 },
        text: "]",
      },
    ]);
    expect(out).toEqual("[abc]");
  });
});
