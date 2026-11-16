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

# Stage the pinned teavm-javac artifacts from R2 into
# webassembly/teavm-compiler/dist. Pin lives in scripts/config.mjs. Needs
# R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in env or web/.dev.vars.
build-teavm:
    node webassembly/teavm-compiler/scripts/stage.mjs

# One-shot: download the current teavm-javac artifacts from teavm.org and
# upload them to R2 under the current pin. Bump TEAVM_PIN in config.mjs
# before running if you want a new cut.
upload-teavm:
    node webassembly/teavm-compiler/scripts/upload.mjs

# Compile the compiler crate to wasm and transpile it into the JS package.
build: build-teavm
    RUSTC_BOOTSTRAP=1 \
    CARGO_TARGET_WASM32_WASIP2_RUSTFLAGS="-C link-arg=-zstack-size=8388608" \
    cargo build --release -p compiler --target wasm32-wasip2
    pnpm --filter @learnrobotics/compiler build

# Run the web dev server (SSR on workerd via vite).
dev:
    pnpm --filter learnrobotics-web dev

# Run Storybook for the web app.
storybook:
    pnpm --filter learnrobotics-web storybook

# Apply D1 migrations to the local dev database.
migrate-local:
    pnpm --filter learnrobotics-web db:migrate

# Format Rust (cargo fmt) and JS/TS/etc (prettier).
format:
    cargo fmt --all
    pnpm exec prettier --write .

clean:
    cargo clean
    pnpm --filter @learnrobotics/compiler clean
    pnpm --filter @learnrobotics/teavm-compiler clean
