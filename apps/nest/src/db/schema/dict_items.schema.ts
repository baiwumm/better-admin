import { nanoid } from 'nanoid';
import { pgTable, text, boolean, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { dictTypes } from './dict_types.schema';

/**
 * dict_items（字典项，可翻译，详见 database-design.md §2.7）
 *
 * - typeCode 外键引用 dict_types.code（字典类型删除时级联删除其项）。
 * - 唯一约束 (type_code, value)、(type_code, label)（v0.9 决策：同类型下 label 唯一）。
 * - i18nKey 存翻译键，label 作中文兜底（详见 §5 国际化方案）。
 */
export const dictItems = pgTable(
  'dict_items',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    typeCode: text('type_code')
      .notNull()
      .references(() => dictTypes.code, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    label: text('label').notNull(),
    i18nKey: text('i18n_key'),
    sort: integer('sort').notNull().default(0),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('dict_items_type_value_unique').on(table.typeCode, table.value),
    uniqueIndex('dict_items_type_label_unique').on(table.typeCode, table.label),
  ],
);
