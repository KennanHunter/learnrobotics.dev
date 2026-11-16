DROP INDEX `account_provider_username_idx`;--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `username`;--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);