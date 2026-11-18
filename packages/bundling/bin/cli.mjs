#!/usr/bin/env node
// Single entrypoint for every bundle pipeline step. CI calls `ci`; local
// devs call individual subcommands. The behavior is identical across both.
import { buildJdk } from "../src/commands/build-jdk.mjs";
import { mirrorTeavm } from "../src/commands/mirror-teavm.mjs";
import { stageTeavm } from "../src/commands/stage-teavm.mjs";
import { uploadRuntime } from "../src/commands/upload-runtime.mjs";

const COMMANDS = {
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
  console.error(
    `Usage: bundling <${Object.keys(COMMANDS).join(" | ")}>`,
  );
  process.exit(cmd ? 2 : 1);
}

try {
  await COMMANDS[cmd]();
  console.log("Done.");
} catch (err) {
  console.error(err.stack ?? err.message ?? String(err));
  process.exit(1);
}
