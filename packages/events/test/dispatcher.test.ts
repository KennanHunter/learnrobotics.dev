import { describe, it, expect, vi } from "vitest";
import { EventDispatcher, type ReplayEvent } from "../src/index";

function edit(t: number): ReplayEvent {
  return {
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
        text: "x",
      },
    ],
  };
}

describe("EventDispatcher", () => {
  it("records events in insertion order", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    d.emit(edit(1));
    d.emit(edit(2));
    d.emit(edit(3));
    expect(d.snapshot().map((e) => e.t)).toEqual([1, 2, 3]);
  });

  it("notifies subscribers in order and disposes cleanly", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    const seen: number[] = [];
    const off = d.subscribe((e) => seen.push(e.t));
    d.emit(edit(1));
    d.emit(edit(2));
    off();
    d.emit(edit(3));
    expect(seen).toEqual([1, 2]);
    expect(d.snapshot()).toHaveLength(3);
  });

  it("drops emits while paused", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    d.emit(edit(1));
    d.pause();
    d.emit(edit(2));
    d.emit(edit(3));
    d.resume();
    d.emit(edit(4));
    expect(d.snapshot().map((e) => e.t)).toEqual([1, 4]);
  });

  it("logs via console when trace is on", () => {
    const d = new EventDispatcher();
    d.setTrace(true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      d.emit(edit(42));
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toMatch(/\[event t=42 type=edit\]/);
    } finally {
      spy.mockRestore();
    }
  });

  it("does not log when trace is explicitly off", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      d.emit(edit(1));
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("snapshot is a copy (immutable from caller)", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    d.emit(edit(1));
    const snap = d.snapshot() as ReplayEvent[];
    snap.push(edit(999));
    expect(d.snapshot()).toHaveLength(1);
  });

  it("clear empties the buffer", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    d.emit(edit(1));
    d.clear();
    expect(d.snapshot()).toEqual([]);
  });
});
