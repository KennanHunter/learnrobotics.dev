import type * as monacoEditor from "monaco-editor";
import {
  type EventDispatcher,
  type MonacoChange,
  type MonacoRange,
} from "@learnrobotics/events";

export type Disposer = () => void;

export interface BindRecorderOptions {
  fileOf: () => string;
  now?: () => number;
  throttleMs?: number;
}

type EditorLike = Pick<
  monacoEditor.editor.IStandaloneCodeEditor,
  "onDidChangeCursorPosition" | "onDidChangeCursorSelection" | "getModel"
>;

type ModelLike = Pick<monacoEditor.editor.ITextModel, "onDidChangeContent">;

function toRange(r: {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}): MonacoRange {
  return {
    startLineNumber: r.startLineNumber,
    startColumn: r.startColumn,
    endLineNumber: r.endLineNumber,
    endColumn: r.endColumn,
  };
}

export function bindRecorder(
  editor: EditorLike,
  dispatcher: EventDispatcher,
  opts: BindRecorderOptions,
  // Optional model override, useful when the caller already has the model
  // handle from `onMount`'s third arg. Falls back to `editor.getModel()`.
  modelOverride?: ModelLike | null,
): Disposer {
  const throttleMs = opts.throttleMs ?? 100;
  const t0 =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const now =
    opts.now ??
    (() => {
      const current =
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      return Math.round(current - t0);
    });

  const model: ModelLike | null = modelOverride ?? editor.getModel();
  const disposers: Array<() => void> = [];

  if (model) {
    const sub = model.onDidChangeContent((event) => {
      if (dispatcher.isPaused()) return;
      const changes: MonacoChange[] = event.changes.map((c) => ({
        range: toRange(c.range),
        text: c.text,
      }));
      dispatcher.emit({
        t: now(),
        type: "edit",
        file: opts.fileOf(),
        changes,
      });
    });
    disposers.push(() => sub.dispose());
  }

  // Throttle cursor/selection: leading emit + trailing timer.
  const makeThrottled = <T>(emitFn: (payload: T) => void) => {
    let lastEmit = -Infinity;
    let pending: T | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      if (pending !== null) {
        lastEmit = now();
        const payload = pending;
        pending = null;
        emitFn(payload);
      }
    };

    const schedule = (payload: T) => {
      if (dispatcher.isPaused()) return;
      const t = now();
      if (t - lastEmit >= throttleMs) {
        lastEmit = t;
        emitFn(payload);
      } else {
        pending = payload;
        if (!timer) {
          timer = setTimeout(flush, throttleMs - (t - lastEmit));
        }
      }
    };

    return {
      schedule,
      dispose: () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        pending = null;
      },
    };
  };

  const cursorThrottle = makeThrottled<{ line: number; column: number }>(
    ({ line, column }) => {
      dispatcher.emit({
        t: now(),
        type: "cursor",
        file: opts.fileOf(),
        line,
        column,
      });
    },
  );

  const selectionThrottle = makeThrottled<MonacoRange[]>((ranges) => {
    dispatcher.emit({
      t: now(),
      type: "selection",
      file: opts.fileOf(),
      ranges,
    });
  });

  const cursorSub = editor.onDidChangeCursorPosition((e) => {
    cursorThrottle.schedule({
      line: e.position.lineNumber,
      column: e.position.column,
    });
  });
  disposers.push(() => cursorSub.dispose());

  const selectionSub = editor.onDidChangeCursorSelection((e) => {
    const ranges = [e.selection, ...(e.secondarySelections ?? [])].map(toRange);
    selectionThrottle.schedule(ranges);
  });
  disposers.push(() => selectionSub.dispose());

  disposers.push(() => cursorThrottle.dispose());
  disposers.push(() => selectionThrottle.dispose());

  return () => {
    for (const d of disposers) d();
  };
}
