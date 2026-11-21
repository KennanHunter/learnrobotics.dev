import type {
  InitEvent,
  MonacoChange,
  MonacoRange,
  ReplayEvent,
} from "./schema";

export interface FileSink {
  replaceAllFiles(files: Record<string, string>, activeFile: string): void;
  applyEdit(file: string, changes: readonly MonacoChange[]): void;
  setActiveFile(file: string): void;
  createFile(file: string, initialContent: string): void;
  deleteFile(file: string): void;
  renameFile(from: string, to: string): void;
  setCursor(file: string, line: number, column: number): void;
  setSelection(file: string, ranges: readonly MonacoRange[]): void;
}

export type Snapshot = {
  /** Index of the last-applied event when this snapshot was captured. */
  eventIndex: number;
  files: Record<string, string>;
  activeFile: string;
};

export type BuildSnapshotsOptions = {
  everyN?: number;
};

/**
 * Walk events left-to-right, freezing the running file map every `everyN`
 * events. Snapshot at index i represents state after applying events[0..=i].
 * Caller is responsible for ensuring events[0] is an InitEvent.
 */
export function buildSnapshots(
  events: readonly ReplayEvent[],
  opts: BuildSnapshotsOptions = {},
): Snapshot[] {
  const everyN = opts.everyN ?? 200;
  if (events.length === 0) return [];
  const first = events[0];
  if (first.type !== "init") {
    throw new Error("buildSnapshots: first event must be init");
  }
  const sink = new PlainFileSink();
  sink.replaceAllFiles(first.files, first.activeFile);
  const out: Snapshot[] = [];
  for (let i = 1; i < events.length; i++) {
    applyEventToSink(sink, events[i]);
    if (i % everyN === 0) {
      out.push({
        eventIndex: i,
        files: sink.snapshotFiles(),
        activeFile: sink.getActiveFile(),
      });
    }
  }
  return out;
}

export type SeekResult = {
  /** Snapshot (or init) to restore before applying. Null means keep current
   * state and just extend forward. */
  restore:
    | { kind: "init"; init: InitEvent }
    | { kind: "snapshot"; snapshot: Snapshot }
    | null;
  /** Range of event indices to apply after restore (inclusive).
   * Null when there is nothing to apply. */
  applyRange: { from: number; to: number } | null;
  /** Final currentIndex after a successful apply (regardless of auto-pause). */
  targetIndex: number;
};

/**
 * Compute what the engine must do to be at `targetMs`.
 * `currentIndex` is the index of the last-applied event (0 means init just
 * applied; -1 means nothing applied yet).
 */
export function resolveSeek(
  events: readonly ReplayEvent[],
  snapshots: readonly Snapshot[],
  currentIndex: number,
  targetMs: number,
): SeekResult {
  if (events.length === 0) {
    return { restore: null, applyRange: null, targetIndex: -1 };
  }
  const init = events[0];
  if (init.type !== "init") {
    throw new Error("resolveSeek: first event must be init");
  }
  // Find greatest index with events[i].t <= targetMs.
  let targetIndex = greatestLE(events, targetMs);
  if (targetIndex < 0) targetIndex = 0; // always at least init

  // Forward case: already past init and in-range → just extend.
  if (currentIndex >= 0 && currentIndex <= targetIndex) {
    const snap = greatestSnapshotLE(snapshots, targetIndex);
    const snapIdx = snap?.eventIndex ?? 0;
    if (currentIndex >= snapIdx) {
      if (currentIndex === targetIndex) {
        return { restore: null, applyRange: null, targetIndex };
      }
      return {
        restore: null,
        applyRange: { from: currentIndex + 1, to: targetIndex },
        targetIndex,
      };
    }
  }

  // Backward seek, or forward with a snapshot shortcut.
  const snap = greatestSnapshotLE(snapshots, targetIndex);
  if (snap) {
    if (snap.eventIndex === targetIndex) {
      return {
        restore: { kind: "snapshot", snapshot: snap },
        applyRange: null,
        targetIndex,
      };
    }
    return {
      restore: { kind: "snapshot", snapshot: snap },
      applyRange: { from: snap.eventIndex + 1, to: targetIndex },
      targetIndex,
    };
  }
  // Restore from init.
  if (targetIndex === 0) {
    return {
      restore: { kind: "init", init },
      applyRange: null,
      targetIndex: 0,
    };
  }
  return {
    restore: { kind: "init", init },
    applyRange: { from: 1, to: targetIndex },
    targetIndex,
  };
}

function greatestLE(events: readonly ReplayEvent[], targetMs: number): number {
  let lo = 0;
  let hi = events.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (events[mid].t <= targetMs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function greatestSnapshotLE(
  snapshots: readonly Snapshot[],
  targetIndex: number,
): Snapshot | null {
  let lo = 0;
  let hi = snapshots.length - 1;
  let ans: Snapshot | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (snapshots[mid].eventIndex <= targetIndex) {
      ans = snapshots[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/** Apply a single event to a FileSink. Shared by buildSnapshots and
 * ReplayEngine so there's one authoritative dispatch table. */
export function applyEventToSink(sink: FileSink, event: ReplayEvent): void {
  switch (event.type) {
    case "init":
      sink.replaceAllFiles(event.files, event.activeFile);
      return;
    case "edit":
      sink.applyEdit(event.file, event.changes);
      return;
    case "cursor":
      sink.setCursor(event.file, event.line, event.column);
      return;
    case "selection":
      sink.setSelection(event.file, event.ranges);
      return;
    case "active-file":
      sink.setActiveFile(event.file);
      return;
    case "file-create":
      sink.createFile(event.file, event.initialContent);
      return;
    case "file-delete":
      sink.deleteFile(event.file);
      return;
    case "file-rename":
      sink.renameFile(event.from, event.to);
      return;
    case "run":
    case "format":
    case "marker":
    case "highlight":
    case "highlight-clear":
    case "auto-pause":
      // No file-state side effects; engine / overlays handle these directly.
      return;
  }
}

/**
 * A pure in-memory FileSink used for snapshotting and tests. Mirrors the
 * minimal contract a Monaco-backed sink must satisfy for file content.
 */
export class PlainFileSink implements FileSink {
  private files: Record<string, string> = {};
  private activeFile = "";

  replaceAllFiles(files: Record<string, string>, activeFile: string): void {
    this.files = { ...files };
    this.activeFile = activeFile;
  }

  applyEdit(file: string, changes: readonly MonacoChange[]): void {
    if (!(file in this.files)) this.files[file] = "";
    this.files[file] = applyChangesToString(this.files[file], changes);
  }

  setActiveFile(file: string): void {
    this.activeFile = file;
  }

  createFile(file: string, initialContent: string): void {
    this.files[file] = initialContent;
  }

  deleteFile(file: string): void {
    delete this.files[file];
  }

  renameFile(from: string, to: string): void {
    if (from in this.files) {
      this.files[to] = this.files[from];
      delete this.files[from];
    }
    if (this.activeFile === from) this.activeFile = to;
  }

  setCursor(_file: string, _line: number, _column: number): void {
    // No-op for pure file-content sink.
  }

  setSelection(_file: string, _ranges: readonly MonacoRange[]): void {
    // No-op.
  }

  snapshotFiles(): Record<string, string> {
    return { ...this.files };
  }

  getActiveFile(): string {
    return this.activeFile;
  }
}

/**
 * FileSink whose methods all no-op. For replay hosts that don't own an
 * editor (reading-lesson recordings, highlight-only streams).
 */
export class NullFileSink implements FileSink {
  replaceAllFiles(_files: Record<string, string>, _activeFile: string): void {}
  applyEdit(_file: string, _changes: readonly MonacoChange[]): void {}
  setActiveFile(_file: string): void {}
  createFile(_file: string, _initialContent: string): void {}
  deleteFile(_file: string): void {}
  renameFile(_from: string, _to: string): void {}
  setCursor(_file: string, _line: number, _column: number): void {}
  setSelection(_file: string, _ranges: readonly MonacoRange[]): void {}
}

/**
 * Apply a batch of Monaco-style edits to a plain string. Changes are applied
 * from last position to first, which matches `model.applyEdits`'s atomic
 * semantics when ranges don't overlap.
 */
export function applyChangesToString(
  source: string,
  changes: readonly MonacoChange[],
): string {
  const sorted = [...changes].sort((a, b) => {
    if (a.range.startLineNumber !== b.range.startLineNumber) {
      return b.range.startLineNumber - a.range.startLineNumber;
    }
    return b.range.startColumn - a.range.startColumn;
  });
  let out = source;
  for (const c of sorted) {
    const start = lineColumnToOffset(
      out,
      c.range.startLineNumber,
      c.range.startColumn,
    );
    const end = lineColumnToOffset(
      out,
      c.range.endLineNumber,
      c.range.endColumn,
    );
    out = out.slice(0, start) + c.text + out.slice(end);
  }
  return out;
}

function lineColumnToOffset(
  source: string,
  line: number,
  column: number,
): number {
  let offset = 0;
  let currentLine = 1;
  while (currentLine < line && offset < source.length) {
    if (source.charCodeAt(offset) === 10 /* \n */) currentLine++;
    offset++;
  }
  // Column is 1-based; cap at end-of-line so bogus columns don't overshoot.
  let col = 1;
  while (col < column && offset < source.length) {
    if (source.charCodeAt(offset) === 10) break;
    offset++;
    col++;
  }
  return offset;
}
