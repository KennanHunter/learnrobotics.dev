import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./users";

export const lessonStarted = sqliteTable(
  "lesson_started",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    disabled: integer("disabled", { mode: "boolean" }),
  },
  (t) => [index("lesson_started_user_idx").on(t.userId)],
);
