CREATE TABLE `purchase_events` (
	`id` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`occurred` integer NOT NULL,
	`received` integer NOT NULL,
	`payload_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`site_origin` text NOT NULL,
	`coupon` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`last_received` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_integrations_key_hash_unique` ON `purchase_integrations` (`key_hash`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`order_id` text NOT NULL,
	`coupon` text NOT NULL,
	`status` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`occurred` integer NOT NULL,
	`received` integer NOT NULL
);
