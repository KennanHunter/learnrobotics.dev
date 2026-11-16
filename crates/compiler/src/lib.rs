//! Minimal wasm-targeted Java compiler.
//!
//! Exposes a single `compile(source) -> result<list<u8>, string>` entry point via
//! the WASI component model. This is a scaffold: it wires up the wit interface
//! so the artifact can be transpiled and consumed from /web.

pub fn run_compile(_source: &str) -> Result<Vec<u8>, String> {
    Err("compile not yet implemented".to_string())
}

#[cfg(test)]
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
