import wasmUrl from "@learnrobotics/teavm-compiler/compiler.wasm?url";
import sdkUrl from "@learnrobotics/teavm-compiler/compile-classlib-teavm.bin?url";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "teavm" });

// Shape of `teavm.exports` for teavm-javac, derived from
// crates/teavm-javac/compiler/src/main/java/org/teavm/javac/Compiler.java
// and its @JSExport/@JSClass annotations.
type Compiler = {
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

export type Diagnostic = {
  readonly type: string;
  readonly severity: "error" | "warning" | "other";
  readonly message: string;
  readonly lineNumber: number;
  readonly columnNumber?: number;
  readonly fileName: string;
};

type TeavmExports = {
  createCompiler(): Compiler;
};

type TeavmRuntime = {
  load(url: string): Promise<{ exports: TeavmExports }>;
};

export type SourceFile = { name: string; content: string };

export type CompiledClass = { name: string; bytes: Uint8Array };

export type CompileResult =
  | { ok: true; classes: CompiledClass[]; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

let cached: Promise<Compiler> | undefined;
let currentDiagnostics: Diagnostic[] | null = null;

async function getCompiler(): Promise<Compiler> {
  if (typeof WebAssembly === "undefined") {
    throw new Error("teavm compiler requires a WebAssembly-capable runtime");
  }
  if (!cached) {
    cached = instantiate().catch((err) => {
      cached = undefined;
      throw err;
    });
  }
  return cached;
}

async function instantiate(): Promise<Compiler> {
  const t0 = performance.now();
  log.info({ wasmUrl, sdkUrl }, "instantiating teavm");

  // The runtime glue is a plain ESM module next to the wasm. Vite doesn't
  // need any special handling — but it's a /node_modules/ file so we route
  // through a dynamic import by relative path. Using the published export
  // via the @learnrobotics/teavm-compiler package keeps bundling honest.
  const runtime =
    (await import("@learnrobotics/teavm-compiler/compiler.wasm-runtime.js")) as TeavmRuntime;

  const [teavm, sdkBytes] = await Promise.all([
    runtime.load(wasmUrl),
    fetch(sdkUrl).then((r) => r.arrayBuffer()),
  ]);

  const compiler = teavm.exports.createCompiler();
  compiler.setSdk(new Int8Array(sdkBytes));

  // Register one long-lived listener; each compile swaps currentDiagnostics.
  compiler.onDiagnostic((d) => {
    if (!currentDiagnostics) return;
    currentDiagnostics.push({
      type: d.type,
      severity: d.severity,
      message: d.message,
      lineNumber: d.lineNumber,
      columnNumber: d.columnNumber,
      fileName: d.fileName,
    });
  });

  log.info(
    { ms: Math.round(performance.now() - t0), sdkBytes: sdkBytes.byteLength },
    "teavm ready",
  );
  return compiler;
}

export async function compileJava(
  files: SourceFile[] | string,
): Promise<CompileResult> {
  const sources: SourceFile[] = (
    typeof files === "string" ? [{ name: "Main.java", content: files }] : files
  ).filter((f) => f.name.endsWith(".java"));

  const compiler = await getCompiler();
  compiler.clearSourceFiles();
  compiler.clearInputClassFiles();
  compiler.clearOutputFiles();

  const diagnostics: Diagnostic[] = [];
  currentDiagnostics = diagnostics;

  for (const f of sources) compiler.addSourceFile(f.name, f.content);

  const t0 = performance.now();
  let ok = false;
  try {
    ok = compiler.compile();
  } finally {
    currentDiagnostics = null;
  }
  const ms = Math.round(performance.now() - t0);

  if (!ok) {
    log.warn(
      { ms, diagnostics: diagnostics.length, files: sources.length },
      "compile failed",
    );
    return { ok: false, diagnostics };
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

  log.info(
    { ms, classes: classes.length, files: sources.length },
    "compile ok",
  );
  return { ok: true, classes, diagnostics };
}
