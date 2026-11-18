import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import {
  listQuizResults,
  masteredQuestionIds,
  requireUser,
  saveQuizResult,
  type QuizResultRecord,
  type StoredQuizResult,
} from "@learnrobotics/db/data";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "quizzes" });

const LoadQuizSchema = v.object({
  quizId: v.pipe(v.string(), v.minLength(1)),
});

export type LoadQuizStateResponse = {
  mastered: string[];
  attempts: QuizResultRecord[];
};

export const loadQuizState = createServerFn({ method: "GET" })
  .validator((data: unknown) => v.parse(LoadQuizSchema, data))
  .handler(async ({ data }): Promise<LoadQuizStateResponse> => {
    const user = await requireUser();
    const [mastered, attempts] = await Promise.all([
      masteredQuestionIds(user.id, data.quizId),
      listQuizResults(user.id, data.quizId),
    ]);
    return { mastered: [...mastered], attempts };
  });

const QuizAnswerSchema = v.object({
  questionId: v.pipe(v.string(), v.minLength(1)),
  correct: v.boolean(),
  payload: v.unknown(),
});

const SaveQuizResultSchema = v.object({
  quizId: v.pipe(v.string(), v.minLength(1)),
  submittedAt: v.pipe(v.string(), v.minLength(1)),
  answers: v.array(QuizAnswerSchema),
});

export const saveQuizAttempt = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(SaveQuizResultSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const result: StoredQuizResult = {
      quizId: data.quizId,
      submittedAt: data.submittedAt,
      answers: data.answers,
    };
    const saved = await saveQuizResult(user.id, result);
    log.info(
      { userId: user.id, quizId: data.quizId, attemptId: saved.id },
      "saveQuizAttempt",
    );
    return { id: saved.id };
  });
