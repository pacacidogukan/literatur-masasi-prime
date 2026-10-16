CREATE TABLE `editor_links` (
	`campaign_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editor_links_token_unique` ON `editor_links` (`token`);