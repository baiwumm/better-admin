import { nanoid } from 'nanoid';
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * 日志表（只增不删，无软删除）
 * 清理策略：原计划按 settings 表 system.logRetentionDays 定时清理，
 * settings 模块已随契约 v1.3 移除；日志清理如需启用，另行以配置文件或
 * 新配置表实现。
 */
export const logs = pgTable(
  'logs',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    type: text('type').notNull(),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    detail: jsonb('detail'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('logs_type_idx').on(table.type),
    index('logs_created_idx').on(table.createdAt),
  ],
);
