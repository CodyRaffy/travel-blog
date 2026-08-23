ALTER TABLE `photos` ADD `phash` text;--> statement-breakpoint
CREATE INDEX `photos_phash_idx` ON `photos` (`phash`);