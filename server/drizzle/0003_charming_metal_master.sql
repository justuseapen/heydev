ALTER TABLE `users` ADD `setup_step` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `setup_completed_at` integer;