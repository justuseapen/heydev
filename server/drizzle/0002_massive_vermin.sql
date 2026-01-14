ALTER TABLE `conversations` ADD `type` text DEFAULT 'feedback' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `fingerprint` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `occurrence_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `last_occurred_at` text;
