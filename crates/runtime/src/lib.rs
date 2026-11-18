//! Wasm-targeted Java compiler wrapper around ristretto_vm.
//!
//! The crate exposes `ping`, `compile`, and `run` via the WASI component
//! model from the `component` module (wasm-only). Pure helpers live in
//! `parse` and compile on the host so they can be unit-tested without
//! satisfying the component's host imports.

pub mod parse;

#[cfg(target_family = "wasm")]
mod component;
