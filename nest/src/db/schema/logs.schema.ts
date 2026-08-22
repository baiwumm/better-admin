import { nanoid } from 'nanoid';
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * 日志表（只增不删，无软删除）
 * 清理策略：建议通过 pg_cron 或 NestJS @Cron() 定时任务，
 * 按 settings 表中 system.logRetentionDays 配置值（默认90天）清理过期日志。
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
