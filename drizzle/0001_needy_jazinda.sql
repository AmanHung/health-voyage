CREATE TABLE `meal_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`record_date` text NOT NULL,
	`created_at` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_meal_owner_date_created` ON `meal_submissions` (`owner_id`,`record_date`,`created_at`);
