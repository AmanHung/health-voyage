import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
export const foodAiAttempts=sqliteTable('food_ai_attempts',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),usageDay:text('usage_day').notNull(),
  createdAt:text('created_at').notNull(),imageHash:text('image_hash').notNull(),payload:text('payload'),
},t=>[index('idx_food_ai_owner_day').on(t.ownerId,t.usageDay),index('idx_food_ai_day').on(t.usageDay)]);
export const mealSubmissions = sqliteTable(
  'meal_submissions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    recordDate: text('record_date').notNull(),
    createdAt: text('created_at').notNull(),
    payload: text('payload').notNull(),
  },
  (table) => [
    index('idx_meal_owner_date_created').on(
      table.ownerId,
      table.recordDate,
      table.createdAt,
    ),
  ],
);
export const exerciseSubmissions = sqliteTable(
  'exercise_submissions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    createdAt: text('created_at').notNull(),
    payload: text('payload').notNull(),
  },
  (table) => [
    index('idx_exercise_owner_created').on(table.ownerId, table.createdAt),
  ],
);
