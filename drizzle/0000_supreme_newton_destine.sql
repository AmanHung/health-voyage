CREATE TABLE `exercise_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_exercise_owner_created` ON `exercise_submissions` (`owner_id`,`created_at`);
