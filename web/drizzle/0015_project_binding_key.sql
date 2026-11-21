DROP INDEX `project_user_lesson_idx`;--> statement-breakpoint
ALTER TABLE `project` RENAME COLUMN `lesson_slug` TO `binding_key`;--> statement-breakpoint
CREATE INDEX `project_user_binding_idx` ON `project` (`user_id`,`binding_key`);
