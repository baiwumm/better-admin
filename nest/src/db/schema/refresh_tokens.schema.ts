import { nanoid } from 'nanoid';
import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * refresh_tokens（刷新令牌托管表）
 *
 * - 只存 refreshToken 的 SHA-256 哈希（不落明文），登出/轮换按哈希精确撤销。
 * - 轮换策略：每次 refresh 删除旧行、写入新行，expiresAt 继承原行（固定窗口，非滑动续期）。
 * - 每用户可存在多行（多设备同时登录，"记住我"各自独立）。
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('refresh_tokens_token_hash_unique').on(table.tokenHash),
    index('refresh_tokens_user_id_idx').on(table.userId),
  ],
);
