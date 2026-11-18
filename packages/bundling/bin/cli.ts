#!/usr/bin/env -S tsx
// Single entrypoint for every bundle pipeline step. CI calls `ci`; local
// devs call individual subcommands. The behavior is identical across both.
import { buildJdk } from "../src/commands/build-jdk.ts";
import { mirrorTeavm } from "../src/commands/mirror-teavm.ts";
import { stageTeavm } from "../src/commands/stage-teavm.ts";
import { uploadRuntime } from "../src/commands/upload-runtime.ts";

const COMMANDS: Record<string, () => Promise<void>> = {
  "mirror-teavm": mirrorTeavm,
  "stage-teavm": stageTeavm,
  "build-jdk": buildJdk,
  "upload-runtime": uploadRuntime,
  // Composite: what CI runs end-to-end. Sequential — upload-runtime needs
  // build-jdk's output on disk.
  async ci() {
    await mirrorTeavm();
    await buildJdk();
    await uploadRuntime();
  },
};

const cmd = process.argv[2];
if (!cmd || !COMMANDS[cmd]) {
  console.error(`Usage: bundling <${Object.keys(COMMANDS).join(" | ")}>`);
  process.exit(cmd ? 2 : 1);
}

try {
  await COMMANDS[cmd]!();
  console.log("Done.");
} catch (err) {
  const e = err as Error;
  console.error(e.stack ?? e.message ?? String(err));
  process.exit(1);
}
