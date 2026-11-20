ALTER TABLE `project` ADD `lesson_slug` text;--> statement-breakpoint
CREATE INDEX `project_user_lesson_idx` ON `project` (`user_id`,`lesson_slug`);