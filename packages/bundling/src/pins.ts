// Single source of truth for bundle pins. Both authoring scripts
// (webassembly/*) and the browser-side manifest (web/src/lib/bundles)
// import from here, so a pin change in one place can't leave the other
// fetching a non-existent R2 object.
//
// Pins are immutable, reproducibility-first identifiers — there is no
// "latest" semantics. Bumping a pin here + re-running the matching upload
// job is the whole lifecycle.

export const TEAVM_PIN = "2026-11-16";

export const JDK_VERSION = "25.0.5.1.2";
export const JDK_PIN = `corretto-${JDK_VERSION}`;
