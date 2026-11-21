export const EVENT_SCHEMA_VERSION = 1;

export type MonacoRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export type MonacoChange = {
  range: MonacoRange;
  text: string;
};

export type InitEvent = {
  t: 0;
  type: "init";
  files: Record<string, string>;
  activeFile: string;
};

export type EditEvent = {
  t: number;
  type: "edit";
  file: string;
  changes: MonacoChange[];
};

export type CursorEvent = {
  t: number;
  type: "cursor";
  file: string;
  line: number;
  column: number;
};

export type SelectionEvent = {
  t: number;
  type: "selection";
  file: string;
  ranges: MonacoRange[];
};

export type ActiveFileEvent = { t: number; type: "active-file"; file: string };
export type FileCreateEvent = {
  t: number;
  type: "file-create";
  file: string;
  initialContent: string;
};
export type FileDeleteEvent = { t: number; type: "file-delete"; file: string };
export type FileRenameEvent = {
  t: number;
  type: "file-rename";
  from: string;
  to: string;
};
export type RunEvent = { t: number; type: "run" };
export type FormatEvent = { t: number; type: "format" };
export type MarkerEvent = { t: number; type: "marker"; label: string };
export type HighlightEvent = {
  t: number;
  type: "highlight";
  target: string;
  durationMs?: number;
};
export type HighlightClearEvent = {
  t: number;
  type: "highlight-clear";
  /** Optional: clear only highlights whose target matches. When omitted,
   * clears every active highlight. */
  target?: string;
};
export type AutoPauseEvent = {
  t: number;
  type: "auto-pause";
  resumeOn?: "edit" | "button";
};

export type ReplayEvent =
  | InitEvent
  | EditEvent
  | CursorEvent
  | SelectionEvent
  | ActiveFileEvent
  | FileCreateEvent
  | FileDeleteEvent
  | FileRenameEvent
  | RunEvent
  | FormatEvent
  | MarkerEvent
  | HighlightEvent
  | HighlightClearEvent
  | AutoPauseEvent;

export type ReplayEventType = ReplayEvent["type"];

export const KNOWN_EVENT_TYPES: ReadonlySet<ReplayEventType> = new Set([
  "init",
  "edit",
  "cursor",
  "selection",
  "active-file",
  "file-create",
  "file-delete",
  "file-rename",
  "run",
  "format",
  "marker",
  "highlight",
  "highlight-clear",
  "auto-pause",
]);
