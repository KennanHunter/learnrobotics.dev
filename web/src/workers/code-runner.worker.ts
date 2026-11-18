/// <reference lib="webworker" />
import { setLogHook, runClasses } from "~/lib/runtime";
import { compileJava, type Diagnostic } from "~/lib/teavm";
import { ensureBundle } from "~/lib/bundles";

export type RunRequest =
  | { type: "run"; source: string }
  | { type: "prefetch" };

export type RunEvent =
  | { type: "phase"; phase: "fetching-deps" | "compiling" | "running" }
  | { type: "deps-ready" }
  | { type: "log"; message: string }
  | { type: "diagnostics"; diagnostics: Diagnostic[] }
  | { type: "done"; ok: true }
  | {
      type: "error";
      stage: "fetch-deps" | "compile" | "run" | "pick-main" | "unknown";
      message: string;
    };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

setLogHook((message) => {
  ctx.postMessage({ type: "log", message } satisfies RunEvent);
});

function pickMainClass(
  classes: { name: string; bytes: Uint8Array }[],
): string | null {
  const outer = classes.find(
    (c) => c.name.endsWith(".class") && !c.name.includes("$"),
  );
  if (!outer) return null;
  return outer.name.replace(/\.class$/, "").replace(/\//g, ".");
}

async function fetchDeps(): Promise<{
  mountPath: string;
  classpath: string[];
} | null> {
  ctx.postMessage({
    type: "phase",
    phase: "fetching-deps",
  } satisfies RunEvent);
  try {
    const jdk = await ensureBundle("jdk");
    ctx.postMessage({ type: "deps-ready" } satisfies RunEvent);
    return jdk;
  } catch (err) {
    ctx.postMessage({
      type: "error",
      stage: "fetch-deps",
      message: err instanceof Error ? err.message : String(err),
    } satisfies RunEvent);
    return null;
  }
}

ctx.addEventListener("message", async (event: MessageEvent<RunRequest>) => {
  const req = event.data;
  if (!req) return;

  if (req.type === "prefetch") {
    await fetchDeps();
    return;
  }

  if (req.type !== "run") return;

  const jdk = await fetchDeps();
  if (!jdk) return;

  try {
    ctx.postMessage({ type: "phase", phase: "compiling" } satisfies RunEvent);
    const compiled = await compileJava(req.source);
    if (!compiled.ok) {
      ctx.postMessage({
        type: "diagnostics",
        diagnostics: compiled.diagnostics,
      } satisfies RunEvent);
      ctx.postMessage({
        type: "error",
        stage: "compile",
        message:
          compiled.diagnostics
            .map(
              (d) =>
                `${d.fileName}:${d.lineNumber}${d.columnNumber ? ":" + d.columnNumber : ""} ${d.severity}: ${d.message}`,
            )
            .join("\n") || "compile failed (no diagnostics)",
      } satisfies RunEvent);
      return;
    }

    const mainClass = pickMainClass(compiled.classes);
    if (!mainClass) {
      ctx.postMessage({
        type: "error",
        stage: "pick-main",
        message:
          "compile ok, but could not find a .class to run. Output: " +
          compiled.classes.map((c) => c.name).join(", "),
      } satisfies RunEvent);
      return;
    }

    ctx.postMessage({ type: "phase", phase: "running" } satisfies RunEvent);
    const result = await runClasses({
      javaHome: jdk.mountPath,
      classpath: jdk.classpath,
      classes: compiled.classes,
      mainClass,
    });
    if (!result.ok) {
      ctx.postMessage({
        type: "error",
        stage: "run",
        message: result.error,
      } satisfies RunEvent);
      return;
    }

    ctx.postMessage({ type: "done", ok: true } satisfies RunEvent);
  } catch (err) {
    ctx.postMessage({
      type: "error",
      stage: "unknown",
      message: err instanceof Error ? err.message : String(err),
    } satisfies RunEvent);
  }
});
