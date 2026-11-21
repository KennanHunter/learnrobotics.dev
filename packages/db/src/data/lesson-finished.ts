import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "../client";
import { logger } from "../log";
import { lessonFinished } from "../schema";

const log = logger.child({ scope: "lesson-finished" });

export type LessonFinishedRecord = {
  id: string;
  lessonId: string;
  createdAt: number;
};

function toMs(d: Date | number): number {
  if (d instanceof Date) return d.getTime();
  const n = Number(d);
  return n < 1e12 ? n * 1000 : n;
}

const activeFilter = or(
  isNull(lessonFinished.disabled),
  eq(lessonFinished.disabled, false),
);

export async function recordLessonFinished(
  userId: string,
  lessonId: string,
): Promise<LessonFinishedRecord> {
  // Dedup: if an active (non-disabled) row already exists for this user +
  // lesson, return it. We don't want duplicate completion events piling up
  // every time the user re-scrolls or re-runs.
  const existing = await getDb()
    .select()
    .from(lessonFinished)
    .where(
      and(
        eq(lessonFinished.userId, userId),
        eq(lessonFinished.lessonId, lessonId),
        activeFilter,
      ),
    )
    .limit(1);
  if (existing[0]) {
    const row = existing[0];
    return { id: row.id, lessonId: row.lessonId, createdAt: toMs(row.createdAt) };
  }
  const id = crypto.randomUUID();
  const now = new Date();
  const inserted = await getDb()
    .insert(lessonFinished)
    .values({ id, userId, lessonId, createdAt: now })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("recordLessonFinished: insert returned no row");
  log.info({ userId, lessonId, id }, "recordLessonFinished");
  return { id: row.id, lessonId: row.lessonId, createdAt: toMs(row.createdAt) };
}

export async function listLessonsFinished(
  userId: string,
): Promise<LessonFinishedRecord[]> {
  const rows = await getDb()
    .select()
    .from(lessonFinished)
    .where(and(eq(lessonFinished.userId, userId), activeFilter))
    .orderBy(desc(lessonFinished.createdAt));
  return rows.map((row) => ({
    id: row.id,
    lessonId: row.lessonId,
    createdAt: toMs(row.createdAt),
  }));
}

export async function disableAllLessonsFinished(userId: string): Promise<void> {
  await getDb()
    .update(lessonFinished)
    .set({ disabled: true })
    .where(eq(lessonFinished.userId, userId));
  log.info({ userId }, "disableAllLessonsFinished");
}
