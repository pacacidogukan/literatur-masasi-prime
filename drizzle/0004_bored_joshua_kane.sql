CREATE TABLE `notification_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`notification_id` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`audience` text NOT NULL,
	`campaign_id` text,
	`created` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL
);
