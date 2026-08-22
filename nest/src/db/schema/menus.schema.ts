import { nanoid } from 'nanoid';
import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * menus（菜单树 + 按钮位掩码，详见 database-design.md §2.3）
 *
 * - parentId 自引用，顶级为 NULL；外键 onDelete: 'restrict'（禁止删除有子级的菜单）。
 * - permissions 为 bigint 按钮位掩码，声明该菜单上有哪些按钮/操作可用（全量位）。
 *
 * 注：自引用表在 TS strict 模式下面临「表在自身初始化表达式中自引用」的循环推断，
 * 故对 references 回调显式标注返回类型为 AnyColumn，打破推断环。
 */
export const menus = pgTable(
  'menus',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    label: text('label').notNull(),
    i18nKey: text('i18n_key'),
    icon: text('icon').notNull(),
    to: text('to'),
    badge: text('badge'),
    parentId: text('parent_id').references((): AnyPgColumn => menus.id, {
      onDelete: 'restrict',
    }),
    sort: integer('sort').notNull().default(0),
    keepAlive: boolean('keep_alive').notNull().default(false),
    hideInMenu: boolean('hide_in_menu').notNull().default(false),
    enabled: boolean('enabled').notNull().default(true),
    defaultOpen: boolean('default_open').notNull().default(false),
    target: text('target').notNull().default('_self'),
    permissions: bigint('permissions', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('menus_parent_idx').on(table.parentId),
    index('menus_sort_idx').on(table.parentId, table.sort),
  ],
);
