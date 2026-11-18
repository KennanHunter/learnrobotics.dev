import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./users";

/**
 * One row per quiz attempt. `result` is the JSON-encoded QuizResult
 * from the editor variant. Retake filtering (which questions to skip)
 * is derived from history, not stored.
 */
export const quizResult = sqliteTable(
  "quiz_result",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    quizId: text("quiz_id").notNull(),
    result: text("result").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("quiz_result_user_quiz_idx").on(t.userId, t.quizId)],
);
