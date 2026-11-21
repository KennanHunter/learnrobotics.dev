import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./users";

export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    starterId: text("starter_id"),
    bindingKey: text("binding_key"),
    activeFile: text("active_file").notNull(),
    files: text("files", { mode: "json" })
      .$type<Record<string, string>>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("project_user_id_idx").on(t.userId),
    index("project_user_updated_idx").on(t.userId, t.updatedAt),
    index("project_user_binding_idx").on(t.userId, t.bindingKey),
  ],
);
