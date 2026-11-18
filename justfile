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

# All bundle pipeline steps are subcommands of the `bundling` CLI
# (packages/bundling). Pins live in packages/bundling/src/pins.mjs;
# local + CI invoke the same code. R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
# from env or web/.dev.vars.

# Stage pinned teavm-javac artifacts from R2 → webassembly/teavm-compiler/dist.
build-teavm:
    node packages/bundling/bin/cli.mjs stage-teavm

# Mirror current teavm-javac artifacts from teavm.org → R2 under TEAVM_PIN.
upload-teavm:
    node packages/bundling/bin/cli.mjs mirror-teavm

# Build the Corretto-derived JDK runtime bundle into
# packages/bundling/dist/jdk/<pin>/bundle.tar.gz.
build-jdk-bundle:
    node packages/bundling/bin/cli.mjs build-jdk

# Push locally-built runtime bundles to R2. Idempotent; skips existing pins.
upload-bundles:
    node packages/bundling/bin/cli.mjs upload-runtime

# Compile the runtime crate to wasm and transpile it into the JS package.
build: build-teavm
    RUSTC_BOOTSTRAP=1 \
    CARGO_TARGET_WASM32_WASIP2_RUSTFLAGS="-C link-arg=-zstack-size=8388608" \
    cargo build --release -p runtime --target wasm32-wasip2
    pnpm --filter @learnrobotics/runtime build

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
    pnpm --filter @learnrobotics/runtime clean
    pnpm --filter @learnrobotics/teavm-compiler clean
