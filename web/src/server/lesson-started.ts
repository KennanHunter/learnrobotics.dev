import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import {
  recordLessonStarted,
  listLessonsStarted,
  disableAllLessonsStarted,
  detachAllLessonProjects,
  requireUser,
  type LessonStartedRecord,
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
    return listLessonsStarted(user.id);
  },
);

export const clearAllLessonProgress = createServerFn({ method: "POST" }).handler(
  async () => {
    const user = await requireUser();
    await disableAllLessonsStarted(user.id);
    const detached = await detachAllLessonProjects(user.id);
    log.info({ userId: user.id, detached }, "clearAllLessonProgress");
    return { detached };
  },
);
