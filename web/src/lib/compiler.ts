import coreUrl from "@learnrobotics/compiler/compiler.core.wasm?url";
import core2Url from "@learnrobotics/compiler/compiler.core2.wasm?url";
import core3Url from "@learnrobotics/compiler/compiler.core3.wasm?url";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "compiler" });

type CompilerRoot = {
  ping(): void;
  compile(source: string): Uint8Array;
  readonly _util: { stop(): void; whenIdle(): Promise<void> };
};

export type LogHook = (message: string) => void;

const wasmLog = logger.child({ scope: "wasm" });

/** Default hook: parse the tracing-subscriber JSON line emitted by the wasm
 *  and forward it to pino at the matching level. Non-JSON lines (e.g. javac
 *  stderr diagnostics) pass through as info. */
const defaultLogHook: LogHook = (message) => {
  const parsed = tryParseTracingLine(message);
  if (!parsed) {
    wasmLog.info({ raw: message }, "wasm");
    return;
  }
  const { level, msg, target, fields } = parsed;
  const payload = { target, ...fields };
  switch (level) {
    case "TRACE":
      wasmLog.trace(payload, msg);
      break;
    case "DEBUG":
      wasmLog.debug(payload, msg);
      break;
    case "INFO":
      wasmLog.info(payload, msg);
      break;
    case "WARN":
      wasmLog.warn(payload, msg);
      break;
    case "ERROR":
      wasmLog.error(payload, msg);
      break;
    default:
      wasmLog.info(payload, msg);
  }
};

type TracingLine = {
  level: string;
  msg: string;
  target?: string;
  fields: Record<string, unknown>;
};

function tryParseTracingLine(line: string): TracingLine | null {
  if (!line.startsWith("{")) return null;
  try {
    const obj = JSON.parse(line) as {
      level?: string;
      target?: string;
      fields?: Record<string, unknown>;
    };
    if (!obj.level || !obj.fields) return null;
    const { message, ...rest } = obj.fields as {
      message?: unknown;
      [k: string]: unknown;
    };
    return {
      level: obj.level,
      msg: typeof message === "string" ? message : "",
      target: obj.target,
      fields: rest,
    };
  } catch {
    return null;
  }
}

let logHook: LogHook = defaultLogHook;

export function setLogHook(hook: LogHook): void {
  logHook = hook;
}

const coreModuleUrls: Record<string, string> = {
  "compiler.core.wasm": coreUrl,
  "compiler.core2.wasm": core2Url,
  "compiler.core3.wasm": core3Url,
};

let cached: Promise<CompilerRoot> | undefined;

export function getCompiler(): Promise<CompilerRoot> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("compiler can only be instantiated in the browser"),
    );
  }
  if (cached) {
    log.debug("getCompiler: returning cached instance");
  } else {
    log.info({ coreUrl }, "getCompiler: starting instantiation");
    cached = instantiateCompiler();
  }
  return cached;
}

async function instantiateCompiler(): Promise<CompilerRoot> {
  const t0 = performance.now();
  log.debug("importing @learnrobotics/compiler + WASI shim");
  const [{ instantiate }, { WASIShim }, cli] = await Promise.all([
    import("@learnrobotics/compiler"),
    import("@bytecodealliance/preview2-shim/instantiation"),
    import("@bytecodealliance/preview2-shim/cli"),
  ]);
  (cli as unknown as { _setStderr: (h: (line: string) => void) => void })
    ._setStderr((line) => logHook(line));
  (cli as unknown as { _setStdout: (h: (line: string) => void) => void })
    ._setStdout((line) => logHook(line));
  log.debug(
    { ms: Math.round(performance.now() - t0) },
    "js bundles imported",
  );

  const imports = {
    ...new WASIShim().getImportObject(),
    "learnrobotics:compiler/host": {
      log: (message: string) => logHook(message),
    },
  };

  const getCoreModule = async (name: string) => {
    const url = coreModuleUrls[name];
    if (!url) {
      log.error({ name }, "unknown core module requested");
      throw new Error(`unknown core module: ${name}`);
    }
    const start = performance.now();
    log.info({ name, url }, "fetching core wasm module");
    const resp = await fetch(url);
    log.debug(
      {
        name,
        status: resp.status,
        contentLength: resp.headers.get("content-length"),
      },
      "core wasm fetch response",
    );
    const module = await WebAssembly.compileStreaming(resp);
    log.info(
      { name, ms: Math.round(performance.now() - start) },
      "core wasm compiled",
    );
    return module;
  };

  try {
    const root = (await instantiate(
      getCoreModule as never,
      imports as never,
    )) as CompilerRoot;
    log.info(
      { ms: Math.round(performance.now() - t0) },
      "compiler ready",
    );
    return root;
  } catch (err) {
    log.error({ err }, "compiler instantiation failed");
    cached = undefined;
    throw err;
  }
}

export async function ping(): Promise<void> {
  const root = await getCompiler();
  log.info("ping: invoking");
  root.ping();
}

export type CompileResult =
  { ok: true; bytes: Uint8Array } | { ok: false; error: string };

export async function compileJava(source: string): Promise<CompileResult> {
  const root = await getCompiler();
  const start = performance.now();
  log.info({ sourceBytes: source.length }, "compileJava: invoking compile");
  try {
    const bytes = root.compile(source);
    log.info(
      { outBytes: bytes.length, ms: Math.round(performance.now() - start) },
      "compileJava: ok",
    );
    return { ok: true, bytes };
  } catch (err) {
    const error = errorMessage(err);
    log.warn({ err: error }, "compileJava: failed");
    return { ok: false, error };
  }
}

function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
