ALTER TABLE `account` ADD `username` text;--> statement-breakpoint
CREATE INDEX `account_provider_username_idx` ON `account` (`provider_id`,`username`);