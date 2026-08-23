CREATE TABLE `geocode_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`raw` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scanned_files` (
	`path` text PRIMARY KEY NOT NULL,
	`size` integer NOT NULL,
	`mtime_ms` integer NOT NULL,
	`in_range` integer DEFAULT false NOT NULL,
	`scanned_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
