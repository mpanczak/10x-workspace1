-- Migration number: 0001 	 2026-07-10T21:26:49.372Z

CREATE TABLE `motorcycle_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organizer_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`ride_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `organizer_messages_ride_id_idx` ON `organizer_messages` (`ride_id`);--> statement-breakpoint
CREATE TABLE `ride_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`ride_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ride_participants_ride_user_idx` ON `ride_participants` (`ride_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `rides` (
	`id` text PRIMARY KEY NOT NULL,
	`organizer_id` text NOT NULL,
	`motorcycle_profile_id` text,
	`route_description` text NOT NULL,
	`riding_style` text NOT NULL,
	`purpose` text NOT NULL,
	`region` text NOT NULL,
	`start_at` integer NOT NULL,
	`planned_arrival_at` integer,
	`start_address` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`motorcycle_profile_id`) REFERENCES `motorcycle_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rides_region_idx` ON `rides` (`region`);--> statement-breakpoint
CREATE INDEX `rides_start_at_idx` ON `rides` (`start_at`);--> statement-breakpoint
CREATE INDEX `rides_riding_style_idx` ON `rides` (`riding_style`);
