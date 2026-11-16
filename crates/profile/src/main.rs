//! Native profiling harness for the compiler component.
//!
//! Loads `target/wasm32-wasip2/release/compiler.wasm`, links WASI + the host
//! log import, invokes `compile(source)` once with a hello-world Java program,
//! and prints wall-clock durations for each phase so we can see where the web
//! build is spending time.

use std::path::PathBuf;
use std::time::Instant;

use anyhow::{Context, Result};
use wasmtime::component::{Component, HasSelf, Linker, ResourceTable};
use wasmtime::{Config, Engine, Store};
use wasmtime_wasi::{DirPerms, FilePerms, WasiCtx, WasiCtxView, WasiView};
use wasmtime_wasi_http::{WasiHttpCtx, WasiHttpView};

wasmtime::component::bindgen!({
    path: "../compiler/wit",
    world: "compiler",
    imports: { default: async },
    exports: { default: async },
});

const SOURCE: &str = r#"class Main {
    public static void main(String[] args) {
        System.out.println("Hello, robot!");
    }
}
"#;

struct HostState {
    ctx: WasiCtx,
    http: WasiHttpCtx,
    table: ResourceTable,
}

impl WasiView for HostState {
    fn ctx(&mut self) -> WasiCtxView<'_> {
        WasiCtxView { ctx: &mut self.ctx, table: &mut self.table }
    }
}

impl WasiHttpView for HostState {
    fn ctx(&mut self) -> &mut WasiHttpCtx {
        &mut self.http
    }
    fn table(&mut self) -> &mut ResourceTable {
        &mut self.table
    }
}

impl learnrobotics::compiler::host::Host for HostState {
    async fn log(&mut self, message: String) {
        println!("[wasm] {message}");
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    let wasm_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("target")
        .join("wasm32-wasip2")
        .join("release")
        .join("compiler.wasm");

    let mut config = Config::new();
    config.async_support(true);
    config.wasm_component_model(true);

    let t_engine = Instant::now();
    let engine = Engine::new(&config)?;
    println!(
        "engine init       {:>8.2?}",
        t_engine.elapsed()
    );

    let t_load = Instant::now();
    let component = Component::from_file(&engine, &wasm_path)
        .with_context(|| format!("loading {}", wasm_path.display()))?;
    println!(
        "component compile {:>8.2?}  ({} bytes on disk)",
        t_load.elapsed(),
        std::fs::metadata(&wasm_path)?.len()
    );

    let mut linker = Linker::<HostState>::new(&engine);
    wasmtime_wasi::p2::add_to_linker_async(&mut linker)?;
    wasmtime_wasi_http::add_only_http_to_linker_async(&mut linker)?;
    Compiler::add_to_linker::<_, HasSelf<HostState>>(&mut linker, |s| s)?;

    let home = std::env::var("HOME").context("HOME not set")?;
    let ctx = WasiCtx::builder()
        .inherit_stdio()
        .inherit_env()
        .preopened_dir(&home, &home, DirPerms::all(), FilePerms::all())?
        .build();
    let state = HostState {
        ctx,
        http: WasiHttpCtx::new(),
        table: ResourceTable::new(),
    };
    let mut store = Store::new(&engine, state);

    let t_instantiate = Instant::now();
    let bindings = Compiler::instantiate_async(&mut store, &component, &linker).await?;
    println!("instantiate       {:>8.2?}", t_instantiate.elapsed());

    let t_ping = Instant::now();
    bindings.call_ping(&mut store).await?;
    println!("ping              {:>8.2?}", t_ping.elapsed());

    for i in 1..=3 {
        let t_compile = Instant::now();
        let result = bindings
            .call_compile(&mut store, SOURCE)
            .await?
            .map_err(|e| anyhow::anyhow!("compile failed: {e}"))?;
        println!(
            "compile #{i}        {:>8.2?}  ({} classfile bytes)",
            t_compile.elapsed(),
            result.len()
        );
    }

    Ok(())
}
