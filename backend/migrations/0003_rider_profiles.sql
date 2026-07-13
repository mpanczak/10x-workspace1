-- Migration number: 0003 	 2026-07-13T11:18:14.459Z

CREATE TABLE `rider_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bio` text,
	`riding_style` text NOT NULL,
	`experience_level` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rider_profiles_user_id_unique` ON `rider_profiles` (`user_id`);
