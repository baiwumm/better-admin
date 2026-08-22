import { pgTable, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { roles } from './roles.schema';

/**
 * user_roles（用户 ↔ 角色 桥接表，详见 database-design.md §2.4）
 *
 * 多对多桥接，联合主键 (user_id, role_id)。
 * 外键级联：用户/角色删除时级联删除其关联。
 */
export const userRoles = pgTable(
  'user_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('user_roles_user_idx').on(table.userId),
    index('user_roles_role_idx').on(table.roleId),
  ],
);
