//! Wasm-targeted Java compiler wrapper around ristretto_vm.
//!
//! Exposes `ping` and `compile(source) -> result<list<u8>, string>` via the WASI
//! component model. Only compiled under `target_family = "wasm"` — on the host,
//! this crate is intentionally empty so `cargo check` doesn't drag in
//! ristretto's toolchain.

#![cfg(target_family = "wasm")]

use std::io::{self, Write};
use std::sync::Once;

use ristretto_classloader::{ClassPath, ClassPathEntry, Memory};
use ristretto_vm::{Compiler, ConfigurationBuilder, VM};
use tracing_subscriber::EnvFilter;
use tracing_subscriber::fmt::MakeWriter;
use tracing_subscriber::prelude::*;

wit_bindgen::generate!({
    path: "wit",
    world: "runtime",
});

use learnrobotics::runtime::host;

struct Component;

impl Guest for Component {
    fn ping() {
        init_logging();
        tracing::info!(target: env!("CARGO_PKG_NAME"), "ping invoked");
        tracing::debug!(target: env!("CARGO_PKG_NAME"), wasm_target = "wasm32-wasip2", "ping details");
        host::log("hello world");
        tracing::info!(target: env!("CARGO_PKG_NAME"), "ping complete");
    }

    fn compile(source: String) -> Result<Vec<u8>, String> {
        init_logging();
        run_compile(&source)
    }

    fn run(
        java_home: String,
        classpath: Vec<String>,
        user_classes: Vec<(String, Vec<u8>)>,
        main_class: String,
    ) -> Result<(), String> {
        init_logging();
        run_classes(&java_home, &classpath, user_classes, &main_class)
    }
}

export!(Component);

fn run_compile(source: &str) -> Result<Vec<u8>, String> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;
    runtime.block_on(compile_async(source))
}

async fn compile_async(source: &str) -> Result<Vec<u8>, String> {
    let class_name = extract_class_name(source)
        .ok_or_else(|| "no class declaration found in source".to_string())?;
    let configuration = ConfigurationBuilder::new()
        .build()
        .map_err(|e| e.to_string())?;
    let compiler = Compiler::new(configuration)
        .await
        .map_err(|e| e.to_string())?;
    let compiled = compiler
        .compile_source(&class_name, source)
        .await
        .map_err(|e| e.to_string())?;
    compiled
        .get(&class_name)
        .map(<[u8]>::to_vec)
        .ok_or_else(|| format!("compiled output missing class {class_name}"))
}

fn run_classes(
    java_home: &str,
    classpath: &[String],
    user_classes: Vec<(String, Vec<u8>)>,
    main_class: &str,
) -> Result<(), String> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;
    runtime.block_on(run_classes_async(java_home, classpath, user_classes, main_class))
}

async fn run_classes_async(
    java_home: &str,
    classpath: &[String],
    user_classes: Vec<(String, Vec<u8>)>,
    main_class: &str,
) -> Result<(), String> {
    let memory = Memory::new("user-classes");
    for (name, bytes) in &user_classes {
        tracing::debug!(
            target: env!("CARGO_PKG_NAME"),
            class = %name,
            bytes = bytes.len(),
            "registering user class",
        );
        memory.add_class(bytes).await.map_err(|e| e.to_string())?;
    }
    let mut entries: Vec<ClassPathEntry> =
        classpath.iter().map(ClassPathEntry::new).collect();
    entries.push(ClassPathEntry::Memory(memory));

    let configuration = ConfigurationBuilder::new()
        .java_home(std::path::PathBuf::from(java_home))
        .class_path(ClassPath::new(entries))
        .main_class(main_class)
        .build()
        .map_err(|e| e.to_string())?;
    tracing::info!(
        target: env!("CARGO_PKG_NAME"),
        java_home = %java_home,
        classpath_entries = classpath.len(),
        user_classes = user_classes.len(),
        main_class = %main_class,
        "booting ristretto VM",
    );
    let vm = VM::new(configuration).await.map_err(|e| e.to_string())?;
    vm.invoke_main(&[] as &[&str])
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn extract_class_name(source: &str) -> Option<String> {
    let mut tokens = source.split_whitespace();
    while let Some(tok) = tokens.next() {
        if tok == "class" {
            let name = tokens.next()?;
            let end = name
                .find(|c: char| !c.is_alphanumeric() && c != '_' && c != '$')
                .unwrap_or(name.len());
            if end > 0 {
                return Some(name[..end].to_string());
            }
        }
    }
    None
}

// -- logging bridge ---------------------------------------------------------
//
// ristretto emits via the `tracing` facade. We install a json-formatting
// subscriber once per instance, routing each event through the wit `host::log`
// import as a single JSON line. The JS caller parses the line and feeds it to
// its own logger (pino).

static LOG_INIT: Once = Once::new();

fn init_logging() {
    LOG_INIT.call_once(|| {
        let filter = EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new("info,ristretto_vm=debug"));
        let fmt_layer = tracing_subscriber::fmt::layer()
            .json()
            .with_writer(HostMakeWriter)
            .with_ansi(false);
        let _ = tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .try_init();
    });
}

struct HostMakeWriter;

impl<'a> MakeWriter<'a> for HostMakeWriter {
    type Writer = HostWriter;
    fn make_writer(&'a self) -> Self::Writer {
        HostWriter(Vec::new())
    }
}

/// Per-event buffer that flushes the full line to `host::log` on drop.
struct HostWriter(Vec<u8>);

impl Write for HostWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.0.extend_from_slice(buf);
        Ok(buf.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

impl Drop for HostWriter {
    fn drop(&mut self) {
        if self.0.is_empty() {
            return;
        }
        let text = String::from_utf8_lossy(&self.0);
        host::log(text.trim_end_matches('\n'));
    }
}
