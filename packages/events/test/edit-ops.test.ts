import { describe, it, expect } from "vitest";
import {
  cropEvents,
  insertAutoPause,
  insertHighlight,
  PlainFileSink,
  applyEventToSink,
  type ReplayEvent,
} from "../src/index";

function basicStream(): ReplayEvent[] {
  const edit = (t: number, text: string): ReplayEvent => ({
    t,
    type: "edit",
    file: "A.java",
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
    { t: 0, type: "init", files: { "A.java": "" }, activeFile: "A.java" },
    edit(100, "a"),
    edit(200, "b"),
    edit(300, "c"),
    edit(400, "d"),
  ];
}

function replayAll(events: readonly ReplayEvent[]): Record<string, string> {
  const sink = new PlainFileSink();
  for (const e of events) applyEventToSink(sink, e);
  return sink.snapshotFiles();
}

describe("cropEvents", () => {
  it("rebases timestamps and reconstructs init from pre-trim state", () => {
    const events = basicStream();
    const cropped = cropEvents(events, { "A.java": "" }, "A.java", 200, 400);
    expect(cropped[0]).toMatchObject({
      t: 0,
      type: "init",
      activeFile: "A.java",
    });
    // Pre-trim applied edits with t < 200 — only edit@100 ("a"). So
    // init.files["A.java"] === "a". Kept events: edit@200, edit@300,
    // edit@400 rebased to 0, 100, 200.
    expect((cropped[0] as { files: Record<string, string> }).files["A.java"]).toEqual("a");
    const final = replayAll(cropped);
    // "a" + insert "b" at (1,1) → "ba" + "c" → "cba" + "d" → "dcba"
    expect(final["A.java"]).toEqual("dcba");
  });

  it("empty crop (tStart === tEnd past all events) returns just init", () => {
    const events = basicStream();
    const cropped = cropEvents(events, { "A.java": "" }, "A.java", 500, 500);
    expect(cropped).toHaveLength(1);
    expect(cropped[0].type).toEqual("init");
  });
});

describe("insertHighlight / insertAutoPause", () => {
  it("inserts a highlight after the last event <= t", () => {
    const events = basicStream();
    const out = insertHighlight(events, 250, "editor:line:3", 3000);
    // Should slot between edit@200 and edit@300.
    const types = out.map((e) => e.type);
    expect(types).toEqual(["init", "edit", "edit", "highlight", "edit", "edit"]);
    expect(out[3]).toEqual({
      t: 250,
      type: "highlight",
      target: "editor:line:3",
      durationMs: 3000,
    });
  });

  it("inserts an auto-pause with default resumeOn=button", () => {
    const events = basicStream();
    const out = insertAutoPause(events, 150);
    expect(out[2]).toEqual({ t: 150, type: "auto-pause", resumeOn: "button" });
  });

  it("does not mutate the input", () => {
    const events = basicStream();
    const before = events.length;
    insertHighlight(events, 250, "editor:line:1");
    expect(events.length).toEqual(before);
  });
});
