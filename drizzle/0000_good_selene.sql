CREATE TABLE `access_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`label` text NOT NULL,
	`suffix` text NOT NULL,
	`expires` integer NOT NULL,
	`max_uses` integer NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_codes_hash_unique` ON `access_codes` (`hash`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`asset` text NOT NULL,
	`photo` text NOT NULL,
	`offer` text NOT NULL,
	`code` text NOT NULL,
	`tag` text NOT NULL,
	`conditions` text NOT NULL,
	`channel` text NOT NULL,
	`expires` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grants` (
	`user_id` text PRIMARY KEY NOT NULL,
	`code_id` text NOT NULL,
	`created` integer NOT NULL
);
