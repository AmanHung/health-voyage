CREATE TABLE `food_ai_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`usage_day` text NOT NULL,
	`created_at` text NOT NULL,
	`image_hash` text NOT NULL,
	`payload` text
);
--> statement-breakpoint
CREATE INDEX `idx_food_ai_owner_day` ON `food_ai_attempts` (`owner_id`,`usage_day`);
--> statement-breakpoint
CREATE INDEX `idx_food_ai_day` ON `food_ai_attempts` (`usage_day`);
