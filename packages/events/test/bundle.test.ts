import { describe, it, expect } from "vitest";
import {
  encodeBundle,
  hashBundle,
  type ReplayEvent,
} from "../src/index";

const events: ReplayEvent[] = [
  { t: 0, type: "init", files: { "A.java": "class A{}" }, activeFile: "A.java" },
  { t: 100, type: "cursor", file: "A.java", line: 1, column: 1 },
];

describe("encodeBundle + hashBundle", () => {
  it("produces a stable hash for the same inputs", async () => {
    const a = encodeBundle({
      events,
      metadata: { lessonId: "foo", title: "Demo" },
    });
    const b = encodeBundle({
      events,
      metadata: { title: "Demo", lessonId: "foo" }, // reordered keys
    });
    const hashA = await hashBundle(a);
    const hashB = await hashBundle(b);
    expect(hashA).toEqual(hashB);
    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different events → different hash", async () => {
    const a = encodeBundle({ events, metadata: {} });
    const altered: ReplayEvent[] = [
      ...events,
      { t: 200, type: "run" },
    ];
    const b = encodeBundle({ events: altered, metadata: {} });
    expect(await hashBundle(a)).not.toEqual(await hashBundle(b));
  });

  it("different audio → different hash", async () => {
    const audio = new Uint8Array([1, 2, 3, 4]);
    const a = encodeBundle({ events, metadata: {}, audio });
    const b = encodeBundle({ events, metadata: {} });
    expect(await hashBundle(a)).not.toEqual(await hashBundle(b));
  });
});
