import { pgTable, text, bigint, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { roles } from './roles.schema';
import { menus } from './menus.schema';

/**
 * role_menus（角色 ↔ 菜单 + 按钮授权位，详见 database-design.md §2.5）
 *
 * 多对多桥接，联合主键 (role_id, menu_id)。
 * permissions 为该角色在此菜单的实际授权位（role_menus.permissions 子集）。
 * 外键级联：角色/菜单删除时级联删除其关联。
 */
export const roleMenus = pgTable(
  'role_menus',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    menuId: text('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    permissions: bigint('permissions', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.menuId] }),
    index('role_menus_role_idx').on(table.roleId),
    index('role_menus_menu_idx').on(table.menuId),
  ],
);
