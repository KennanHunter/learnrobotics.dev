import type { ContentIndex, IndexedLesson } from "@learnrobotics/content";

export type ProgressEntry = {
  startedAt?: number;
  finishedAt?: number;
};

export type LessonProgress = Map<string, ProgressEntry>;

export function buildProgress(
  started: { lessonId: string; startedAt: number }[],
  finished: { lessonId: string; finishedAt: number }[],
): LessonProgress {
  const m: LessonProgress = new Map();
  for (const e of started) m.set(e.lessonId, { startedAt: e.startedAt });
  for (const e of finished) {
    const prev = m.get(e.lessonId) ?? {};
    m.set(e.lessonId, { ...prev, finishedAt: e.finishedAt });
  }
  return m;
}

/** Returns a new ContentIndex with `status` + `startedAt` / `finishedAt`
 * decorated from the per-user progress map. `finished` wins over `started`
 * ("done" trumps "in-progress"). Preserves pre-existing `placement-passed`.
 */
export function applyStatuses(
  index: ContentIndex,
  progress: LessonProgress,
): ContentIndex {
  return {
    ...index,
    units: index.units.map((unit) => ({
      ...unit,
      chapters: unit.chapters.map((chapter) => ({
        ...chapter,
        lessons: chapter.lessons.map((lesson): IndexedLesson => {
          const id = `${unit.slug}/${chapter.slug}/${lesson.slug}`;
          const entry = progress.get(id);
          if (!entry) return lesson;
          let decorated = {
            ...lesson,
            startedAt: entry.startedAt,
            finishedAt: entry.finishedAt,
          } as IndexedLesson;
          if (lesson.status === "placement-passed") return decorated;
          if (entry.finishedAt != null) {
            decorated = { ...decorated, status: "done" } as IndexedLesson;
          } else if (entry.startedAt != null) {
            decorated = {
              ...decorated,
              status: "in-progress",
            } as IndexedLesson;
          }
          return decorated;
        }),
      })),
    })),
  };
}
