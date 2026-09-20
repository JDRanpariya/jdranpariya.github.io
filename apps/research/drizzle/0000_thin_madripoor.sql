CREATE TABLE `research_annotations` (
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`collection` text NOT NULL,
	`record_id` text NOT NULL,
	`decision` text DEFAULT 'unreviewed' NOT NULL,
	`private_notes` text DEFAULT '' NOT NULL,
	`public_notes` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `collection`, `record_id`)
);
--> statement-breakpoint
CREATE INDEX `research_annotations_public_idx` ON `research_annotations` (`owner_email`,`is_published`);