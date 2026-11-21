import {
  createContext,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";
import type { Diagnostic, RunEvent, RunRequest } from "./protocol";

export type ConsoleTab = "stdout" | "compile" | "deps";
export type BundleState = "unknown" | "fetching" | "ready" | "failed";
export type RunState = "idle" | "compiling" | "running";

export type CodeRunnerStarter = {
  files: Record<string, string>;
  activeFile: string;
};

export type CodeRunnerStore = {
  files: Accessor<Record<string, string>>;
  activeFile: Accessor<string>;
  setActiveFile: (path: string) => void;
  setFileContent: (path: string, content: string) => void;
  /** Remove a path from the virtual FS. If the removed path was the active
   * file, caller is responsible for choosing the next active path. */
  deleteFile: (path: string) => void;
  /** Move a file's content to a new path and drop the old key. No-op if the
   * source doesn't exist or the destination already does. */
  renameFile: (oldPath: string, newPath: string) => void;
  /** Convenience: current file's content. */
  source: Accessor<string>;
  /** Convenience: write to activeFile. */
  setSource: (s: string) => void;

  stdout: Accessor<string>;
  diagnostics: Accessor<Diagnostic[]>;
  compileError: Accessor<string | null>;
  depsProgress: Accessor<{ received: number; total: number | null } | null>;

  bundleState: Accessor<BundleState>;
  runState: Accessor<RunState>;
  /** Seconds since the current run started. 0 when idle. */
  runElapsedSeconds: Accessor<number>;

  activeConsoleTab: Accessor<ConsoleTab>;
  setActiveConsoleTab: (id: ConsoleTab) => void;
  tabBadges: Accessor<Record<ConsoleTab, number>>;

  isBusy: Accessor<boolean>;
  onRun: () => void;
  onStop: () => void;
  retryDeps: () => void;
};

const CodeRunnerContext = createContext<CodeRunnerStore>();

export function useCodeRunner(): CodeRunnerStore {
  const ctx = useContext(CodeRunnerContext);
  if (!ctx) throw new Error("useCodeRunner outside provider");
  return ctx;
}

export type CodeRunnerProviderProps = {
  starter: CodeRunnerStarter;
  createWorker: () => Worker;
  children: JSX.Element;
};

export function CodeRunnerProvider(props: CodeRunnerProviderProps) {
  console.log("[CodeRunnerProvider] body", {
    starterFiles: Object.keys(props.starter.files ?? {}),
    activeFile: props.starter.activeFile,
  });
  if (typeof window !== "undefined") {
    // Grab every uncaught error / rejection so hydration mismatches,
    // Monaco import failures, etc. land somewhere visible.
    window.addEventListener(
      "error",
      (e) => {
        console.error("[window.error]", {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          error: e.error,
        });
      },
      { once: true },
    );
    window.addEventListener(
      "unhandledrejection",
      (e) => {
        console.error("[unhandledrejection]", {
          reason: e.reason,
          message:
            e.reason instanceof Error ? e.reason.message : String(e.reason),
          stack: e.reason instanceof Error ? e.reason.stack : undefined,
        });
      },
      { once: true },
    );
  }
  const [files, setFiles] = createSignal<Record<string, string>>({
    ...props.starter.files,
  });
  const [activeFile, setActiveFile] = createSignal(props.starter.activeFile);
  const source = () => files()[activeFile()] ?? "";
  function setSource(next: string) {
    setFiles({ ...files(), [activeFile()]: next });
  }
  function setFileContent(path: string, content: string) {
    setFiles({ ...files(), [path]: content });
  }
  function deleteFile(path: string) {
    const current = files();
    if (!(path in current)) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(current)) {
      if (k === path) continue;
      next[k] = v;
    }
    setFiles(next);
  }
  function renameFile(oldPath: string, newPath: string) {
    if (oldPath === newPath) return;
    const current = files();
    if (!(oldPath in current)) return;
    if (newPath in current) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(current)) {
      if (k === oldPath) next[newPath] = v;
      else next[k] = v;
    }
    setFiles(next);
    if (activeFile() === oldPath) setActiveFile(newPath);
  }
  const [stdout, setStdout] = createSignal("");
  const [diagnostics, setDiagnostics] = createSignal<Diagnostic[]>([]);
  const [compileError, setCompileError] = createSignal<string | null>(null);
  const [depsProgress, setDepsProgress] = createSignal<{
    received: number;
    total: number | null;
  } | null>(null);
  const [bundleState, setBundleState] = createSignal<BundleState>("unknown");
  const [runState, setRunState] = createSignal<RunState>("idle");
  const [runElapsedSeconds, setRunElapsedSeconds] = createSignal(0);
  let runStartedAt: number | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  function startElapsedTimer() {
    if (elapsedTimer) return;
    runStartedAt = Date.now();
    setRunElapsedSeconds(0);
    elapsedTimer = setInterval(() => {
      if (runStartedAt == null) return;
      setRunElapsedSeconds(Math.floor((Date.now() - runStartedAt) / 1000));
    }, 250);
  }

  function stopElapsedTimer() {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
    runStartedAt = null;
    setRunElapsedSeconds(0);
  }
  const [activeConsoleTab, setActiveTabSignal] =
    createSignal<ConsoleTab>("stdout");
  const [tabBadges, setTabBadges] = createSignal<Record<ConsoleTab, number>>({
    stdout: 0,
    compile: 0,
    deps: 0,
  });

  // Once the user clicks a tab, auto-promote stops until the next Run.
  let stickyActive = false;
  let sawFirstLogThisRun = false;

  function autoPromote(id: ConsoleTab) {
    if (stickyActive) {
      if (activeConsoleTab() !== id) bumpBadge(id);
      return;
    }
    if (activeConsoleTab() !== id) setActiveTabSignal(id);
  }

  function bumpBadge(id: ConsoleTab) {
    setTabBadges((prev) => ({ ...prev, [id]: prev[id] + 1 }));
  }

  function setActiveConsoleTab(id: ConsoleTab) {
    stickyActive = true;
    setActiveTabSignal(id);
    setTabBadges((prev) => ({ ...prev, [id]: 0 }));
  }

  let worker: Worker | null = null;

  function ensureWorker(): Worker {
    if (worker) return worker;
    const w = props.createWorker();
    w.addEventListener("message", (event: MessageEvent<RunEvent>) => {
      const msg = event.data;
      switch (msg.type) {
        case "phase":
          if (msg.phase === "fetching-deps") {
            setBundleState("fetching");
            autoPromote("deps");
          } else if (msg.phase === "compiling") {
            setRunState("compiling");
          } else if (msg.phase === "running") {
            setRunState("running");
          }
          break;
        case "deps-ready":
          setBundleState("ready");
          break;
        case "deps-progress":
          setDepsProgress({ received: msg.received, total: msg.total });
          break;
        case "log":
          setStdout((prev) => prev + msg.message + "\n");
          if (!sawFirstLogThisRun) {
            sawFirstLogThisRun = true;
            autoPromote("stdout");
          }
          break;
        case "diagnostics":
          setDiagnostics(msg.diagnostics);
          autoPromote("compile");
          break;
        case "error":
          if (msg.stage === "fetch-deps") {
            setBundleState("failed");
            autoPromote("deps");
          } else {
            setCompileError(msg.message);
            autoPromote("compile");
          }
          setRunState("idle");
          stopElapsedTimer();
          break;
        case "done":
          setRunState("idle");
          stopElapsedTimer();
          break;
      }
    });
    w.addEventListener("error", (event: ErrorEvent) => {
      setCompileError(event.message || "worker crashed");
      setRunState("idle");
      stopElapsedTimer();
      if (bundleState() === "fetching") setBundleState("failed");
    });
    worker = w;
    return w;
  }

  onMount(() => {
    ensureWorker().postMessage({ type: "prefetch" } satisfies RunRequest);
  });

  onCleanup(() => {
    worker?.terminate();
    worker = null;
    stopElapsedTimer();
  });

  function isBusy() {
    return runState() !== "idle" || bundleState() === "fetching";
  }

  function onRun() {
    if (isBusy()) return;
    setStdout("");
    setCompileError(null);
    setDiagnostics([]);
    stickyActive = false;
    sawFirstLogThisRun = false;
    setTabBadges({ stdout: 0, compile: 0, deps: 0 });
    if (bundleState() !== "ready") setBundleState("fetching");
    startElapsedTimer();
    const map = files();
    const sourceFiles = Object.entries(map).map(([name, content]) => ({
      name,
      content,
    }));
    ensureWorker().postMessage({
      type: "run",
      files: sourceFiles,
      activeFile: activeFile(),
    } satisfies RunRequest);
  }

  function onStop() {
    worker?.terminate();
    worker = null;
    setRunState("idle");
    setBundleState("unknown");
    setDepsProgress(null);
    stopElapsedTimer();
  }

  function retryDeps() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    setBundleState("unknown");
    setDepsProgress(null);
    ensureWorker().postMessage({ type: "prefetch" } satisfies RunRequest);
  }

  const store: CodeRunnerStore = {
    files,
    activeFile,
    setActiveFile,
    setFileContent,
    deleteFile,
    renameFile,
    source,
    setSource,
    stdout,
    diagnostics,
    compileError,
    depsProgress,
    bundleState,
    runState,
    runElapsedSeconds,
    activeConsoleTab,
    setActiveConsoleTab,
    tabBadges,
    isBusy,
    onRun,
    onStop,
    retryDeps,
  };

  return (
    <CodeRunnerContext.Provider value={store}>
      {props.children}
    </CodeRunnerContext.Provider>
  );
}
