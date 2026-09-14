import { nanoid } from 'nanoid';
import { pgTable, text, boolean, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * roles（角色表，详见 database-design.md §2.2）
 *
 * name / code 均唯一。
 */
export const roles = pgTable(
  'roles',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    enabled: boolean('enabled').notNull().default(true),
    sort: integer('sort').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('roles_name_unique').on(table.name),
    uniqueIndex('roles_code_unique').on(table.code),
  ],
);
