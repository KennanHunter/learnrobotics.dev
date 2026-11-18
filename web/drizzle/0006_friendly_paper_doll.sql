CREATE TABLE `quiz_result` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`quiz_id` text NOT NULL,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_result_user_quiz_idx` ON `quiz_result` (`user_id`,`quiz_id`);