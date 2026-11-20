// Provider-driven implementation of the playground pipeline: TeaVM javac
// compiles Java source, the compiled classes are handed to ristretto_vm via
// a preopen-mounted JDK bundle, and stdout is streamed back as log lines.
//
// This mirrors what web/src/workers/code-runner.worker.ts does end-to-end,
// but sources every byte through caller-supplied providers so the same
// pipeline runs under Node (test harness) and the browser worker. The
// browser worker currently has its own copy; a follow-up can collapse it
// into this module.
//
// All WASI filesystem interactions assume preview2-shim's browser
// (in-memory) variant. Node tests force that via `resolve.conditions:
// ["browser"]` so the preopen tree shape matches the browser code path.

import { gunzip, parseTar } from "~/lib/bundles/tar";
import { stagePreopen } from "~/lib/bundles/stage";

export type CompiledClass = { name: string; bytes: Uint8Array };

export type Diagnostic = {
  readonly type: string;
  readonly severity: "error" | "warning" | "other";
  readonly message: string;
  readonly lineNumber: number;
  readonly columnNumber?: number;
  readonly fileName: string;
};

export type Providers = {
  teavmWasm: () => Promise<Uint8Array | ArrayBuffer>;
  teavmSdk: () => Promise<Uint8Array | ArrayBuffer>;
  // name is one of "runtime.core.wasm", "runtime.core2.wasm",
  // "runtime.core3.wasm".
  ristrettoCore: (name: string) => Promise<WebAssembly.Module>;
  jdkTarball: () => Promise<Uint8Array>;
};

export type PipelineResult =
  | { ok: true; stdout: string; classes: CompiledClass[] }
  | {
      ok: false;
      stage: "compile" | "run";
      error: string;
      diagnostics?: Diagnostic[];
      stdout: string;
    };

type TeavmCompiler = {
  setSdk(content: Int8Array): void;
  clearSourceFiles(): void;
  clearInputClassFiles(): void;
  clearOutputFiles(): void;
  addSourceFile(name: string, content: string): void;
  onDiagnostic(cb: (d: Diagnostic) => void): unknown;
  compile(): boolean;
  listOutputFiles(): string[];
  getOutputFile(name: string): Int8Array | null;
};

type TeavmRuntime = {
  load(bytes: Uint8Array | ArrayBuffer): Promise<{
    exports: { createCompiler(): TeavmCompiler };
  }>;
};

type RuntimeRoot = {
  run(
    javaHome: string,
    classpath: string[],
    userClasses: [string, Uint8Array][],
    mainClass: string,
  ): void;
};

const JDK_MOUNT = "/bundles/jdk";

function pickMainClass(classes: CompiledClass[]): string | null {
  const outer = classes.find(
    (c) => c.name.endsWith(".class") && !c.name.includes("$"),
  );
  if (!outer) return null;
  return outer.name.replace(/\.class$/, "").replace(/\//g, ".");
}

async function compileSource(
  providers: Providers,
  source: string,
): Promise<
  | { ok: true; classes: CompiledClass[] }
  | { ok: false; diagnostics: Diagnostic[]; error: string }
> {
  const [{ load }, wasmBytes, sdkBytes] = await Promise.all([
    import("@learnrobotics/teavm-compiler/compiler.wasm-runtime.js") as Promise<TeavmRuntime>,
    providers.teavmWasm(),
    providers.teavmSdk(),
  ]);
  const teavm = await load(wasmBytes);
  const compiler = teavm.exports.createCompiler();
  const sdk =
    sdkBytes instanceof Uint8Array ? sdkBytes : new Uint8Array(sdkBytes);
  compiler.setSdk(new Int8Array(sdk.buffer, sdk.byteOffset, sdk.byteLength));

  const diagnostics: Diagnostic[] = [];
  compiler.onDiagnostic((d) => {
    diagnostics.push({
      type: d.type,
      severity: d.severity,
      message: d.message,
      lineNumber: d.lineNumber,
      columnNumber: d.columnNumber,
      fileName: d.fileName,
    });
  });

  compiler.clearSourceFiles();
  compiler.clearInputClassFiles();
  compiler.clearOutputFiles();
  compiler.addSourceFile("Main.java", source);

  const ok = compiler.compile();
  if (!ok) {
    const error =
      diagnostics
        .map(
          (d) =>
            `${d.fileName}:${d.lineNumber}${d.columnNumber ? ":" + d.columnNumber : ""} ${d.severity}: ${d.message}`,
        )
        .join("\n") || "compile failed (no diagnostics)";
    return { ok: false, diagnostics, error };
  }

  const classes: CompiledClass[] = compiler.listOutputFiles().map((name) => {
    const bytes = compiler.getOutputFile(name);
    if (!bytes)
      throw new Error(`teavm listed ${name} but getOutputFile returned null`);
    return {
      name,
      bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    };
  });
  return { ok: true, classes };
}

async function stageJdk(providers: Providers): Promise<void> {
  const compressed = await providers.jdkTarball();
  const unpacked = await gunzip(compressed);
  const files = parseTar(unpacked);
  await stagePreopen(JDK_MOUNT, files);
}

async function instantiateRuntime(
  providers: Providers,
  onLogLine: (line: string) => void,
): Promise<RuntimeRoot> {
  const [{ instantiate }, { WASIShim }, cli] = await Promise.all([
    import("@learnrobotics/runtime"),
    import("@bytecodealliance/preview2-shim/instantiation"),
    import("@bytecodealliance/preview2-shim/cli"),
  ]);
  (
    cli as unknown as { _setStdout: (h: (line: string) => void) => void }
  )._setStdout(onLogLine);
  (
    cli as unknown as { _setStderr: (h: (line: string) => void) => void }
  )._setStderr(onLogLine);
  const imports = {
    ...new WASIShim().getImportObject(),
    "learnrobotics:runtime/host": {
      log: onLogLine,
    },
  };
  return (await instantiate(
    ((name: string) => providers.ristrettoCore(name)) as never,
    imports as never,
  )) as RuntimeRoot;
}

export async function compileAndRun(
  source: string,
  providers: Providers,
  mainClassOverride?: string,
): Promise<PipelineResult> {
  const stdoutLines: string[] = [];
  const captureLine = (line: string) => {
    // Rust tracing-subscriber emits JSON log lines; those are internal
    // diagnostics, not program stdout. Keep the rest.
    if (line.startsWith("{") && line.includes('"level"')) return;
    stdoutLines.push(line);
  };

  const compile = await compileSource(providers, source);
  if (!compile.ok) {
    return {
      ok: false,
      stage: "compile",
      error: compile.error,
      diagnostics: compile.diagnostics,
      stdout: "",
    };
  }

  const mainClass =
    mainClassOverride ?? pickMainClass(compile.classes) ?? "Main";

  await stageJdk(providers);
  const runtime = await instantiateRuntime(providers, captureLine);

  try {
    runtime.run(
      JDK_MOUNT,
      [],
      compile.classes.map((c) => [c.name, c.bytes]),
      mainClass,
    );
  } catch (err) {
    return {
      ok: false,
      stage: "run",
      error: err instanceof Error ? err.message : String(err),
      stdout: stdoutLines.join("\n"),
    };
  }

  return { ok: true, stdout: stdoutLines.join("\n"), classes: compile.classes };
}
