set shell := ["bash", "-euo", "pipefail", "-c"]

# Install JS deps and build the compiler. Run this once before `just dev`.
default: install build

install:
    pnpm install

# Rust tests. `runtime`'s component glue can't be instantiated by the default
# test harness (its WIT `host::log` import is unsatisfied), so tests live in
# `tests/` and run on the host, where the component module is cfg'd out and
# only pure helpers compile. `profile` is a host-only tool and is excluded.
test:
    cargo test --workspace --exclude profile

# End-to-end playground pipeline test (teavm → JDK → ristretto) running in
# Node via vitest's browser resolve conditions. First run downloads the real
# JDK tarball to web/.cache/bundles/; warm runs reuse it.
#
# Defaults to the preview deploy's /api/bundles proxy; override with
# JDK_BUNDLE_URL=<direct url> when the deploy is stale or unreachable.
test-pipeline:
    pnpm --filter learnrobotics-web test:pipeline

# All bundle pipeline steps are subcommands of the `bundling` CLI
# (packages/bundling). Pins live in packages/bundling/src/pins.ts;
# local + CI invoke the same code. R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
# from env or web/.dev.vars.

# Stage pinned teavm-javac artifacts from R2 → webassembly/teavm-compiler/dist.
build-teavm:
    pnpm tsx packages/bundling/bin/cli.ts stage-teavm

# Mirror current teavm-javac artifacts from teavm.org → R2 under TEAVM_PIN.
upload-teavm:
    pnpm tsx packages/bundling/bin/cli.ts mirror-teavm

# Build the Corretto-derived JDK runtime bundle into
# packages/bundling/dist/jdk/<pin>/bundle.tar.gz.
build-jdk-bundle:
    pnpm tsx packages/bundling/bin/cli.ts build-jdk

# Push locally-built runtime bundles to R2. Idempotent; skips existing pins.
upload-bundles:
    pnpm tsx packages/bundling/bin/cli.ts upload-runtime

# Compile the runtime crate to wasm and transpile it into the JS package.
# Does NOT stage teavm — run `just build-teavm` once (or whenever the pin
# changes). This target warns if the staged artifacts are missing.
build:
    @test -f webassembly/teavm-compiler/dist/compiler.wasm \
        || echo "warning: webassembly/teavm-compiler/dist is empty — run 'just build-teavm' to stage teavm artifacts" >&2
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
