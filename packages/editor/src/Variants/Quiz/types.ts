export type QuizAnswer = {
  questionId: string;
  correct: boolean;
  /** Kind-specific answer payload (selected index, final ordering, …). */
  payload: unknown;
};

export type QuizResult = {
  quizId: string;
  /** ISO-8601 timestamp of when the user submitted. */
  submittedAt: string;
  answers: QuizAnswer[];
};
