import { nanoid } from 'nanoid';
import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

/**
 * dict_types（字典类型表，详见 database-design.md §2.6）
 *
 * code 唯一（使用 UNIQUE 约束而非唯一索引——dict_items.type_code 外键引用
 * 该非主键列，PostgreSQL 要求被引用列在加外键时即有唯一约束，约束内联进
 * CREATE TABLE，避免迁移中「先加外键、后建索引」的顺序问题）。
 */
export const dictTypes = pgTable(
  'dict_types',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique('dict_types_code_unique').on(table.code)],
);
