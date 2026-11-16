import coreUrl from "@learnrobotics/compiler/compiler.core.wasm?url";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "compiler" });

type CompilerRoot = {
  compile(source: string): Uint8Array;
  readonly _util: { stop(): void; whenIdle(): Promise<void> };
};

const coreModuleUrls: Record<string, string> = {
  "compiler.core.wasm": coreUrl,
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
  const [{ instantiate }, { WASIShim }] = await Promise.all([
    import("@learnrobotics/compiler"),
    import("@bytecodealliance/preview2-shim/instantiation"),
  ]);
  log.debug(
    { ms: Math.round(performance.now() - t0) },
    "js bundles imported",
  );

  const imports = new WASIShim().getImportObject();

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
