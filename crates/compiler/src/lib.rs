//! Minimal wasm-targeted Java compiler wrapper around ristretto_vm.
//!
//! Exposes a single `compile(source) -> result<list<u8>, string>` entry point via
//! the WASI component model. This is a scaffold: it wires up the dependency chain
//! and wit interface so the artifact can be transpiled and consumed from /web.

use ristretto_vm::{Compiler, ConfigurationBuilder};

#[cfg(target_family = "wasm")]
wit_bindgen::generate!({
    path: "wit",
    world: "compiler",
});

#[cfg(target_family = "wasm")]
struct Component;

#[cfg(target_family = "wasm")]
impl Guest for Component {
    fn compile(source: String) -> Result<Vec<u8>, String> {
        run_compile(&source)
    }
}

#[cfg(target_family = "wasm")]
export!(Component);

pub fn run_compile(source: &str) -> Result<Vec<u8>, String> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;
    runtime.block_on(async move { compile_async(source).await })
}

async fn compile_async(_source: &str) -> Result<Vec<u8>, String> {
    let configuration = ConfigurationBuilder::new()
        .build()
        .map_err(|e| e.to_string())?;
    let _compiler = Compiler::new(configuration)
        .await
        .map_err(|e| e.to_string())?;
    // TODO: write source to an in-memory workspace, invoke compiler.compile(&args),
    // and return the produced classfile bytes.
    Err("compile not yet implemented".to_string())
}

#[cfg(all(test, not(target_family = "wasm")))]
mod tests {
    use super::*;

    #[test]
    fn stub_compile_returns_not_implemented() {
        let err = run_compile("class A {}").unwrap_err();
        assert!(
            err.contains("not yet implemented"),
            "unexpected error: {err}"
        );
    }
}
