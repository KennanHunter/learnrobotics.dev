import coreUrl from "@learnrobotics/compiler/compiler.core.wasm?url";

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
  cached ??= instantiateCompiler();
  return cached;
}

async function instantiateCompiler(): Promise<CompilerRoot> {
  const [{ instantiate }, { WASIShim }] = await Promise.all([
    import("@learnrobotics/compiler"),
    import("@bytecodealliance/preview2-shim/instantiation"),
  ]);

  const imports = new WASIShim().getImportObject();

  const getCoreModule = async (name: string) => {
    const url = coreModuleUrls[name];
    if (!url) throw new Error(`unknown core module: ${name}`);
    return WebAssembly.compileStreaming(fetch(url));
  };

  return (await instantiate(
    getCoreModule as never,
    imports as never,
  )) as CompilerRoot;
}

export type CompileResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: string };

export async function compileJava(source: string): Promise<CompileResult> {
  const root = await getCompiler();
  try {
    const bytes = root.compile(source);
    return { ok: true, bytes };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
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
