# compiler wasm — perf & plumbing notes

Snapshot of what was changed and what's still slow. More findings than
optimizations; the actual latency wins are still owed.

## Numbers

Measured on native `wasmtime` via `crates/profile` with the `~/.ristretto`
JDK cache preopened on `$HOME`. Same wasm artifact the browser loads.

```
component compile   ~1.3s   (jit of the 8.7 MB component)
instantiate         ~0.5ms
ping                ~75µs
compile #1         15.76s   cold JDK + VM boot + javac
compile #2          5.98s   warm — but still re-creates the Compiler
compile #3          6.00s
```

Takeaway: even the "warm" path is 6s per compile, and the web's "forever"
has two independent causes stacked on top of that number.

## Changes that landed

### 1. Build gating — `crates/compiler/src/lib.rs`

`#![cfg(target_family = "wasm")]` at the crate root plus moving ristretto
/ tokio / wit-bindgen under `[target.'cfg(target_family = "wasm")'...]`.
Host `cargo check` and rust-analyzer no longer try to build ristretto_vm.
Added `.zed/settings.json` pointing rust-analyzer at `wasm32-wasip2` with
`RUSTC_BOOTSTRAP=1` so the editor's check target matches the justfile.

### 2. Core module map — `web/src/lib/compiler.ts`

jco now emits `compiler.core.wasm`, `compiler.core2.wasm`, and
`compiler.core3.wasm` (main + preview1 adapter cores). The old map only
knew about `core.wasm`, which threw "unknown core module: compiler.core2.wasm"
at instantiation. All three are now mapped via Vite `?url` imports.

### 3. Structured tracing out of the wasm

- `wit`: new `interface host { log: func(message: string); }`, imported
  by the component world.
- Rust: install a one-shot `tracing-subscriber` with the JSON formatter
  and a `MakeWriter` that buffers per-event and calls `host::log(line)` on
  drop. Default filter `info,ristretto_vm=debug`, overridable with
  `RUST_LOG`.
- JS: `defaultLogHook` in `compiler.ts` parses each JSON line and dispatches
  into pino at the matching level, with `{target, ...fields}` as structured
  metadata. Non-JSON lines (javac `System.err.println`, panics) pass
  through as `info` with `{raw}`.
- Also hooks `@bytecodealliance/preview2-shim/cli`'s `_setStderr` /
  `_setStdout` so javac diagnostics (which go via `wasi:cli/stderr`, not
  through tracing) are captured in the same pipe.

### 4. Native profiling harness — `crates/profile`

Loads `target/wasm32-wasip2/release/compiler.wasm` via `wasmtime` with
`WasiCtx` + `WasiHttpCtx`, preopens `$HOME` so ristretto's `~/.ristretto`
cache is reachable, times engine init / component compile / instantiate /
ping / compile ×3. The source of the numbers above. `cargo run --release
-p profile`.

## Known cost drivers (unaddressed)

### JDK fetch over `wasi:http`

ristretto's `version_class_loader` on `wasm32-wasip2` falls through to the
native path: check env vars, then `~/.ristretto/<os>-<arch>/<version>`,
then **download from Azul over `wasi:http`**. The browser's preview2 shim
doesn't serve outbound HTTP, so the first compile request hangs.
No `RISTRETTO_JDK_HOME` or equivalent is injected. This is the bulk of
"forever" in the browser — the native profile only completes because the
preopen gives ristretto the cached JDK on disk.

### Per-call VM rebuild — `crates/compiler/src/lib.rs::compile_async`

Each `compile` call does
`Compiler::new(ConfigurationBuilder::new().build()?).await?`. There is no
global instance. Even with the JDK available, the second compile takes ~6s
because a new `VM` + classloader + bridge initialization runs every time.

## Next

Ordered by payoff:

1. **Cache the `Compiler`.** One global `OnceCell<Mutex<Compiler>>` in the
   wasm module, reused across calls. First compile pays the ~16s cold
   boot; subsequent ones should drop well below 6s once javac stays warm.
2. **Ship the JDK.** Either bake a minimal Java 25 class library into the
   component, or sideload it as a blob and point ristretto at a
   preopened virtual FS via `RISTRETTO_JDK_HOME`. Without this, the
   browser cannot compile at all.
3. **Rich compile errors.** `ristretto_vm::CompilerError` is currently a
   bare enum (`CompilationFailed`, `InvalidArguments`, ...) with no
   diagnostics. The javac messages reach the host only via
   `System.err.println` from the bridge, and we now capture them, but
   they're unstructured. Upstreaming a diagnostic listener into the
   bridge would let us return structured `{line, column, message}`
   diagnostics in the wit `result<list<u8>, string>` error branch rather
   than scraping stderr.
