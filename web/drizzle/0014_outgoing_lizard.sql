CREATE TABLE `lesson_finished` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`disabled` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lesson_finished_user_idx` ON `lesson_finished` (`user_id`);