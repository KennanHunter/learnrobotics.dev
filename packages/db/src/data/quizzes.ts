import { and, eq } from "drizzle-orm";
import { getDb } from "../client";
import { logger } from "../log";
import { quizResult } from "../schema";

const log = logger.child({ scope: "quizzes" });

/** Shape-only — matches `QuizResult` in @learnrobotics/editor. */
export type StoredQuizResult = {
  quizId: string;
  submittedAt: string;
  answers: Array<{
    questionId: string;
    correct: boolean;
    payload: unknown;
  }>;
};

export type QuizResultRecord = {
  id: string;
  quizId: string;
  result: StoredQuizResult;
  createdAt: number;
};

function toMs(d: Date | number): number {
  if (d instanceof Date) return d.getTime();
  const n = Number(d);
  return n < 1e12 ? n * 1000 : n;
}

export async function saveQuizResult(
  userId: string,
  result: StoredQuizResult,
): Promise<QuizResultRecord> {
  const id = crypto.randomUUID();
  const now = new Date();
  const inserted = await getDb()
    .insert(quizResult)
    .values({
      id,
      userId,
      quizId: result.quizId,
      result: JSON.stringify(result),
      createdAt: now,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("saveQuizResult: insert returned no row");
  log.info({ userId, quizId: result.quizId, id }, "saveQuizResult");
  return {
    id: row.id,
    quizId: row.quizId,
    result,
    createdAt: toMs(row.createdAt),
  };
}

export async function deleteAllQuizResults(userId: string): Promise<number> {
  const deleted = await getDb()
    .delete(quizResult)
    .where(eq(quizResult.userId, userId))
    .returning({ id: quizResult.id });
  log.info({ userId, count: deleted.length }, "deleteAllQuizResults");
  return deleted.length;
}

export async function listQuizResults(
  userId: string,
  quizId: string,
): Promise<QuizResultRecord[]> {
  const rows = await getDb()
    .select()
    .from(quizResult)
    .where(and(eq(quizResult.userId, userId), eq(quizResult.quizId, quizId)));
  return rows.map((row) => ({
    id: row.id,
    quizId: row.quizId,
    result: JSON.parse(row.result) as StoredQuizResult,
    createdAt: toMs(row.createdAt),
  }));
}

/**
 * Union of question ids the user has ever answered correctly for this
 * quiz. Drives the retake filter.
 */
export async function masteredQuestionIds(
  userId: string,
  quizId: string,
): Promise<Set<string>> {
  const history = await listQuizResults(userId, quizId);
  const mastered = new Set<string>();
  for (const attempt of history) {
    for (const answer of attempt.result.answers) {
      if (answer.correct) mastered.add(answer.questionId);
    }
  }
  return mastered;
}
