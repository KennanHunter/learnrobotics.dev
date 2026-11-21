import type { ContentIndex, IndexedLesson } from "@learnrobotics/content";

/** Returns a new ContentIndex with `status = "in-progress"` on lessons
 * whose `${unitSlug}/${chapterSlug}/${lessonSlug}` is in `startedIds`.
 * Preserves an existing `done` / `placement-passed` status if already set.
 */
export function applyStatuses(
  index: ContentIndex,
  startedIds: Set<string>,
): ContentIndex {
  return {
    ...index,
    units: index.units.map((unit) => ({
      ...unit,
      chapters: unit.chapters.map((chapter) => ({
        ...chapter,
        lessons: chapter.lessons.map((lesson): IndexedLesson => {
          const id = `${unit.slug}/${chapter.slug}/${lesson.slug}`;
          if (!startedIds.has(id)) return lesson;
          if (lesson.status === "done" || lesson.status === "placement-passed") {
            return lesson;
          }
          return { ...lesson, status: "in-progress" } as IndexedLesson;
        }),
      })),
    })),
  };
}
