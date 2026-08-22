import { nanoid } from 'nanoid';
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * users（用户表，详见 database-design.md §2.1）
 *
 * - 主键 id 由服务端 nanoid(12) 生成。
 * - 软删除使用 deletedAt（timestamptz, nullable）。
 * - username / email 采用部分唯一索引：仅对未删除记录（deleted_at IS NULL）
 *   施加唯一约束，已软删记录可释放用户名/邮箱供复用。
 */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    avatar: text('avatar'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('users_username_unique_active')
      .on(table.username)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex('users_email_unique_active')
      .on(table.email)
      .where(sql`${table.deletedAt} is null`),
  ],
);
