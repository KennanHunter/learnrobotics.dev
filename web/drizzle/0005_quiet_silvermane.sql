CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`starter_id` text,
	`active_file` text NOT NULL,
	`files` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_user_id_idx` ON `project` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_user_updated_idx` ON `project` (`user_id`,`updated_at`);