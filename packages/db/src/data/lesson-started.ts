import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "../client";
import { logger } from "../log";
import { lessonStarted } from "../schema";

const log = logger.child({ scope: "lesson-started" });

export type LessonStartedRecord = {
  id: string;
  lessonId: string;
  createdAt: number;
};

function toMs(d: Date | number): number {
  if (d instanceof Date) return d.getTime();
  const n = Number(d);
  return n < 1e12 ? n * 1000 : n;
}

export async function recordLessonStarted(
  userId: string,
  lessonId: string,
): Promise<LessonStartedRecord> {
  const id = crypto.randomUUID();
  const now = new Date();
  const inserted = await getDb()
    .insert(lessonStarted)
    .values({ id, userId, lessonId, createdAt: now })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("recordLessonStarted: insert returned no row");
  log.info({ userId, lessonId, id }, "recordLessonStarted");
  return { id: row.id, lessonId: row.lessonId, createdAt: toMs(row.createdAt) };
}

const activeFilter = or(
  isNull(lessonStarted.disabled),
  eq(lessonStarted.disabled, false),
);

export async function listLessonsStarted(
  userId: string,
): Promise<LessonStartedRecord[]> {
  const rows = await getDb()
    .select()
    .from(lessonStarted)
    .where(and(eq(lessonStarted.userId, userId), activeFilter))
    .orderBy(desc(lessonStarted.createdAt));
  return rows.map((row) => ({
    id: row.id,
    lessonId: row.lessonId,
    createdAt: toMs(row.createdAt),
  }));
}

export async function hasStartedLesson(
  userId: string,
  lessonId: string,
): Promise<boolean> {
  const rows = await getDb()
    .select({ id: lessonStarted.id })
    .from(lessonStarted)
    .where(
      and(
        eq(lessonStarted.userId, userId),
        eq(lessonStarted.lessonId, lessonId),
        activeFilter,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function disableAllLessonsStarted(userId: string): Promise<void> {
  await getDb()
    .update(lessonStarted)
    .set({ disabled: true })
    .where(eq(lessonStarted.userId, userId));
  log.info({ userId }, "disableAllLessonsStarted");
}
