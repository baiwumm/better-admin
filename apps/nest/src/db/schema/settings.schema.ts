import { nanoid } from 'nanoid';
import { pgTable, text, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * settings（系统设置表，详见 database-design.md §2.8）
 *
 * - value 为 jsonb，可为字符串/数字/布尔/对象。
 * - group 分组：basic/user/theme/system。
 * - key 唯一。
 * - 写入权限独立化：PUT /api/settings/:key 需 SETTINGS_UPDATE 位（bit 128），
 *   不与菜单/业务数据 EDIT 位复用（详见 §2.8）。
 */
export const settings = pgTable(
  'settings',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    group: text('group').notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('settings_key_unique').on(table.key)],
);
