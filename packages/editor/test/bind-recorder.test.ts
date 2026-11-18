import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventDispatcher } from "@learnrobotics/events";
import { bindRecorder } from "../src/CodeEditor/bind-recorder";

type ContentListener = (e: {
  changes: Array<{ range: Range; text: string }>;
}) => void;
type CursorListener = (e: {
  position: { lineNumber: number; column: number };
}) => void;
type SelectionListener = (e: {
  selection: Range;
  secondarySelections?: Range[];
}) => void;

type Range = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

function makeFakeEditor() {
  const contentListeners: ContentListener[] = [];
  const cursorListeners: CursorListener[] = [];
  const selectionListeners: SelectionListener[] = [];

  const model = {
    onDidChangeContent(fn: ContentListener) {
      contentListeners.push(fn);
      return {
        dispose() {
          const i = contentListeners.indexOf(fn);
          if (i >= 0) contentListeners.splice(i, 1);
        },
      };
    },
  };

  const editor = {
    getModel() {
      return model as unknown as import("monaco-editor").editor.ITextModel;
    },
    onDidChangeCursorPosition(fn: CursorListener) {
      cursorListeners.push(fn);
      return {
        dispose() {
          const i = cursorListeners.indexOf(fn);
          if (i >= 0) cursorListeners.splice(i, 1);
        },
      };
    },
    onDidChangeCursorSelection(fn: SelectionListener) {
      selectionListeners.push(fn);
      return {
        dispose() {
          const i = selectionListeners.indexOf(fn);
          if (i >= 0) selectionListeners.splice(i, 1);
        },
      };
    },
  };

  return {
    editor:
      editor as unknown as import("monaco-editor").editor.IStandaloneCodeEditor,
    triggerEdit(text: string) {
      const r: Range = {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      };
      for (const l of contentListeners) l({ changes: [{ range: r, text }] });
    },
    triggerCursor(line: number, column: number) {
      for (const l of cursorListeners)
        l({ position: { lineNumber: line, column } });
    },
    triggerSelection(ranges: Range[]) {
      for (const l of selectionListeners)
        l({ selection: ranges[0], secondarySelections: ranges.slice(1) });
    },
    counts() {
      return {
        content: contentListeners.length,
        cursor: cursorListeners.length,
        selection: selectionListeners.length,
      };
    },
  };
}

describe("bindRecorder", () => {
  let fakeNow = 0;
  const now = () => fakeNow;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeNow = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits an edit event when the model content changes", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    const f = makeFakeEditor();
    bindRecorder(f.editor, d, { fileOf: () => "Main.java", now });

    fakeNow = 500;
    f.triggerEdit("x");

    const events = d.snapshot();
    expect(events).toHaveLength(1);
    const [e] = events;
    expect(e.type).toBe("edit");
    if (e.type === "edit") {
      expect(e.file).toBe("Main.java");
      expect(e.changes).toHaveLength(1);
      expect(e.changes[0].text).toBe("x");
      expect(e.t).toBe(500);
    }
  });

  it("throttles cursor events: leading immediate + trailing flush", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    const f = makeFakeEditor();
    bindRecorder(f.editor, d, {
      fileOf: () => "Main.java",
      now,
      throttleMs: 100,
    });

    fakeNow = 0;
    f.triggerCursor(1, 1); // leading emit
    fakeNow = 20;
    f.triggerCursor(1, 2); // suppressed, pending
    fakeNow = 50;
    f.triggerCursor(1, 3); // still pending

    const cursors1 = d.snapshot().filter((e) => e.type === "cursor");
    expect(cursors1).toHaveLength(1);

    // Advance past the throttle window to flush trailing emit
    fakeNow = 150;
    vi.advanceTimersByTime(100);

    const cursors2 = d.snapshot().filter((e) => e.type === "cursor");
    expect(cursors2).toHaveLength(2);
    if (cursors2[1].type === "cursor") {
      expect(cursors2[1].column).toBe(3);
    }
  });

  it("throttles selection events similarly", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    const f = makeFakeEditor();
    bindRecorder(f.editor, d, {
      fileOf: () => "Main.java",
      now,
      throttleMs: 100,
    });

    const range = (sc: number) => ({
      startLineNumber: 1,
      startColumn: sc,
      endLineNumber: 1,
      endColumn: sc + 1,
    });

    fakeNow = 0;
    f.triggerSelection([range(1)]);
    fakeNow = 10;
    f.triggerSelection([range(2)]);

    expect(d.snapshot().filter((e) => e.type === "selection")).toHaveLength(1);

    fakeNow = 200;
    vi.advanceTimersByTime(200);

    expect(d.snapshot().filter((e) => e.type === "selection")).toHaveLength(2);
  });

  it("disposer unregisters all listeners", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    const f = makeFakeEditor();
    const off = bindRecorder(f.editor, d, { fileOf: () => "Main.java", now });

    expect(f.counts()).toEqual({ content: 1, cursor: 1, selection: 1 });

    off();
    expect(f.counts()).toEqual({ content: 0, cursor: 0, selection: 0 });

    f.triggerEdit("y");
    f.triggerCursor(1, 2);
    expect(d.snapshot()).toHaveLength(0);
  });

  it("drops events while the dispatcher is paused", () => {
    const d = new EventDispatcher();
    d.setTrace(false);
    const f = makeFakeEditor();
    bindRecorder(f.editor, d, { fileOf: () => "Main.java", now });

    d.pause();
    f.triggerEdit("x");
    f.triggerCursor(1, 1);
    expect(d.snapshot()).toHaveLength(0);

    d.resume();
    f.triggerEdit("y");
    expect(d.snapshot().filter((e) => e.type === "edit")).toHaveLength(1);
  });
});
