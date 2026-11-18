import { describe, it, expect } from "vitest";
import { encodeEvents, decodeEvents, type ReplayEvent } from "../src/index";

const sample: ReplayEvent[] = [
  {
    t: 0,
    type: "init",
    files: { "Main.java": "class Main{}" },
    activeFile: "Main.java",
  },
  {
    t: 123,
    type: "edit",
    file: "Main.java",
    changes: [
      {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        },
        text: "x",
      },
    ],
  },
  { t: 456, type: "cursor", file: "Main.java", line: 10, column: 4 },
  { t: 789, type: "highlight", target: "editor:line:3", durationMs: 2000 },
];

describe("codec", () => {
  it("round-trips events through encode/decode", () => {
    const encoded = encodeEvents(sample);
    const decoded = decodeEvents(encoded);
    expect(decoded).toEqual(sample);
  });

  it("rejects unknown type", () => {
    const line = JSON.stringify({ t: 1, type: "bogus-type" });
    expect(() => decodeEvents(line)).toThrow(/unknown type/);
  });

  it("rejects missing type", () => {
    const line = JSON.stringify({ t: 1 });
    expect(() => decodeEvents(line)).toThrow(/missing type/);
  });

  it("skips blank lines", () => {
    const encoded = encodeEvents(sample) + "\n\n";
    expect(decodeEvents(encoded)).toEqual(sample);
  });
});
