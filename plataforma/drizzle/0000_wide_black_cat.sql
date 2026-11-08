CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`plan` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`limits` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`account_id` text,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`production_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`production_id`) REFERENCES `productions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episode_production_number` ON `episodes` (`production_id`,`number`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_account_email` ON `memberships` (`account_id`,`email`);--> statement-breakpoint
CREATE TABLE `productions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`style` text NOT NULL,
	`topic` text NOT NULL,
	`episodes` integer NOT NULL,
	`duration` integer NOT NULL,
	`budget_cents` integer NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`bible` text,
	`outline` text,
	`error` text,
	`request_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `productions_request_key_unique` ON `productions` (`request_key`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`niche` text NOT NULL,
	`audience` text NOT NULL,
	`brand_color` text NOT NULL,
	`brief` text NOT NULL,
	`language` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`production_id` text NOT NULL,
	`account_id` text NOT NULL,
	`period` text NOT NULL,
	`seconds` integer NOT NULL,
	`cents` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`production_id`) REFERENCES `productions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_production_id_unique` ON `reservations` (`production_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`production_id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`lease_token` text DEFAULT '' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`step_key` text DEFAULT '' NOT NULL,
	`planning_cents` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`production_id`) REFERENCES `productions`(`id`) ON UPDATE no action ON DELETE no action
);
