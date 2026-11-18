export type Diagnostic = {
  readonly type: string;
  readonly severity: "error" | "warning" | "other";
  readonly message: string;
  readonly lineNumber: number;
  readonly columnNumber?: number;
  readonly fileName: string;
};

export type SourceFile = { name: string; content: string };

export type RunRequest =
  | { type: "run"; files: SourceFile[]; activeFile: string }
  | { type: "prefetch" };

export type RunEvent =
  | { type: "phase"; phase: "fetching-deps" | "compiling" | "running" }
  | { type: "deps-ready" }
  | { type: "deps-progress"; received: number; total: number | null }
  | { type: "log"; message: string }
  | { type: "diagnostics"; diagnostics: Diagnostic[] }
  | { type: "done"; ok: true }
  | {
      type: "error";
      stage: "fetch-deps" | "compile" | "run" | "pick-main" | "unknown";
      message: string;
    };
