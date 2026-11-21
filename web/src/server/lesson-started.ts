import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import {
  recordLessonStarted,
  listLessonsStarted,
  disableAllLessonsStarted,
  recordLessonFinished,
  listLessonsFinished,
  disableAllLessonsFinished,
  detachAllBoundProjects,
  deleteAllQuizResults,
  requireUser,
  type LessonStartedRecord,
  type LessonFinishedRecord,
} from "@learnrobotics/db/data";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "lesson-started" });

const MarkStartedSchema = v.object({
  lessonId: v.pipe(v.string(), v.minLength(1)),
});

export const markLessonStarted = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(MarkStartedSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const saved = await recordLessonStarted(user.id, data.lessonId);
    log.info(
      { userId: user.id, lessonId: data.lessonId, id: saved.id },
      "markLessonStarted",
    );
    return { id: saved.id };
  });

export const loadLessonsStarted = createServerFn({ method: "GET" }).handler(
  async (): Promise<LessonStartedRecord[]> => {
    const user = await requireUser();
    const rows = await listLessonsStarted(user.id);
    log.info({ userId: user.id, count: rows.length }, "loadLessonsStarted");
    return rows;
  },
);

export const clearAllLessonProgress = createServerFn({ method: "POST" }).handler(
  async () => {
    const user = await requireUser();
    await disableAllLessonsStarted(user.id);
    await disableAllLessonsFinished(user.id);
    const detached = await detachAllBoundProjects(user.id);
    const deletedQuizResults = await deleteAllQuizResults(user.id);
    log.info(
      { userId: user.id, detached, deletedQuizResults },
      "clearAllLessonProgress",
    );
    return { detached, deletedQuizResults };
  },
);

export const markLessonFinished = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(MarkStartedSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const saved = await recordLessonFinished(user.id, data.lessonId);
    log.info(
      { userId: user.id, lessonId: data.lessonId, id: saved.id },
      "markLessonFinished",
    );
    return { id: saved.id };
  });

export const loadLessonsFinished = createServerFn({ method: "GET" }).handler(
  async (): Promise<LessonFinishedRecord[]> => {
    const user = await requireUser();
    const rows = await listLessonsFinished(user.id);
    log.info({ userId: user.id, count: rows.length }, "loadLessonsFinished");
    return rows;
  },
);
