set shell := ["bash", "-euo", "pipefail", "-c"]

# Install JS deps and build the compiler. Run this once before `just dev`.
default: install build

install:
    pnpm install

# Rust unit tests across the workspace (wasm32-wasip2).
test:
    RUSTC_BOOTSTRAP=1 \
    CARGO_TARGET_WASM32_WASIP2_RUSTFLAGS="-C link-arg=-zstack-size=8388608" \
    CARGO_TARGET_WASM32_WASIP2_RUNNER=wasmtime \
    cargo test --workspace --target wasm32-wasip2

# Compile the compiler crate to wasm and transpile it into the JS package.
build:
    RUSTC_BOOTSTRAP=1 \
    CARGO_TARGET_WASM32_WASIP2_RUSTFLAGS="-C link-arg=-zstack-size=8388608" \
    cargo build --release -p compiler --target wasm32-wasip2
    pnpm --filter @learnrobotics/compiler build

# Run the web dev server (SSR on workerd via vite).
dev:
    pnpm --filter learnrobotics-web dev

# Apply D1 migrations to the local dev database.
migrate-local:
    pnpm --filter learnrobotics-web db:migrate

clean:
    cargo clean
    pnpm --filter @learnrobotics/compiler clean
