import { describe, it, expect } from "vitest";

// Load each lesson file as raw text so this test doesn't depend on the
// MDX plugin being wired into the vitest config. Lesson files live at
// content/units/<unit>/<chapter>/<NN-slug>.<locale>.{mdx,tsx}.
const rawFiles = import.meta.glob<string>(
  "../../content/units/*/*/*.*.{mdx,tsx}",
  { eager: true, query: "?raw", import: "default" },
);

const BASE_LOCALE = "en";

function parseLessonFilename(
  name: string,
): { locale: string } | undefined {
  const m = name.match(/^\d+-.+\.([a-z-]+)\.(?:mdx|tsx)$/);
  return m ? { locale: m[1]! } : undefined;
}

function extractLessonId(contents: string): string | undefined {
  // Grab the id inside the first defineLesson({ ... }) call. The negated
  // character class [^{}] prevents crossing into nested objects (e.g.
  // the `questions: [{ id, ... }]` array on quiz lessons).
  const m = contents.match(
    /defineLesson\s*\(\s*\{[^{}]*?id:\s*["']([^"']+)["']/,
  );
  return m?.[1];
}

describe("lesson ids", () => {
  it("are globally unique across all units and chapters (base locale)", () => {
    const seen = new Map<string, string[]>();
    for (const [path, contents] of Object.entries(rawFiles)) {
      const parts = path.split("/");
      const file = parts.at(-1)!;
      const parsed = parseLessonFilename(file);
      // Only check the base locale — translations deliberately reuse ids.
      if (!parsed || parsed.locale !== BASE_LOCALE) continue;
      const id = extractLessonId(contents);
      expect(id, `no defineLesson({ id }) found in ${path}`).toBeDefined();
      const rel = parts.slice(-3).join("/");
      const arr = seen.get(id!) ?? [];
      arr.push(rel);
      seen.set(id!, arr);
    }
    const dupes = [...seen].filter(([, paths]) => paths.length > 1);
    expect(
      dupes,
      `duplicate lesson ids:\n${dupes
        .map(([id, paths]) => `  ${id}: ${paths.join(", ")}`)
        .join("\n")}`,
    ).toHaveLength(0);
  });
});
