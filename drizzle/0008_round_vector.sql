CREATE TABLE `mobile_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mobile_sessions_user_id_unique` ON `mobile_sessions` (`user_id`);