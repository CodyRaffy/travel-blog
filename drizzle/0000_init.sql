CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`dropbox_path` text NOT NULL,
	`dropbox_rev` text,
	`file_name` text NOT NULL,
	`size_bytes` integer,
	`taken_at` text,
	`latitude` real,
	`longitude` real,
	`width` integer,
	`height` integer,
	`stop_id` text,
	`curation_status` text DEFAULT 'unreviewed' NOT NULL,
	`score` real,
	`sort_order` integer,
	`caption` text,
	`variants` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`stop_id`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photos_dropbox_path_idx` ON `photos` (`dropbox_path`);--> statement-breakpoint
CREATE INDEX `photos_stop_idx` ON `photos` (`stop_id`);--> statement-breakpoint
CREATE INDEX `photos_taken_at_idx` ON `photos` (`taken_at`);--> statement-breakpoint
CREATE INDEX `photos_status_idx` ON `photos` (`curation_status`);--> statement-breakpoint
CREATE TABLE `post_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`body` text NOT NULL,
	`posted_at` text NOT NULL,
	`media` text DEFAULT '[]' NOT NULL,
	`suggested_stop_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`post_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`suggested_stop_id`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_candidates_source_idx` ON `post_candidates` (`source_id`);--> statement-breakpoint
CREATE INDEX `post_candidates_status_idx` ON `post_candidates` (`status`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`stop_id` text,
	`title` text,
	`body` text NOT NULL,
	`posted_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_id` text,
	`media` text DEFAULT '[]' NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`stop_id`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `posts_stop_idx` ON `posts` (`stop_id`);--> statement-breakpoint
CREATE INDEX `posts_posted_at_idx` ON `posts` (`posted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `posts_source_idx` ON `posts` (`source`,`source_id`);--> statement-breakpoint
CREATE TABLE `stop_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`suggested_name` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`arrival_date` text NOT NULL,
	`departure_date` text NOT NULL,
	`photo_count` integer DEFAULT 0 NOT NULL,
	`photo_ids` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stop_id` text,
	`merged_into_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`stop_id`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `stop_candidates_status_idx` ON `stop_candidates` (`status`);--> statement-breakpoint
CREATE TABLE `stops` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`state_park` integer DEFAULT false NOT NULL,
	`national_monument` integer DEFAULT false NOT NULL,
	`national_park` integer DEFAULT false NOT NULL,
	`arrival_date` text NOT NULL,
	`departure_date` text NOT NULL,
	`journey_lat_long_tuples` text DEFAULT '[]' NOT NULL,
	`cover_photo_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stops_slug_idx` ON `stops` (`slug`);--> statement-breakpoint
CREATE INDEX `stops_arrival_idx` ON `stops` (`arrival_date`);