import { nanoid } from 'nanoid';
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  unique,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema';

/**
 * depts（组织表，详见 database-design.md §2.11）
 *
 * - 无限级树形结构：parentId 为 null 表示顶级组织（集团）。
 * - 软删除使用 deletedAt；name / code 采用部分唯一索引：
 *   仅对未删除记录（deleted_at IS NULL）施加唯一约束，软删后名称/编码可复用。
 * - 岗位仅作组织数据，不参与权限聚合（架构决策，见 progress.md 契约 v1.6.0 条目）。
 */
export const depts = pgTable(
  'depts',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    parentId: text('parent_id').references((): AnyPgColumn => depts.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    code: text('code'),
    /** 负责人用户 ID；负责人被删除时置空 */
    leaderId: text('leader_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    /** 同级排序号，数字越大越靠前 */
    sort: integer('sort').notNull().default(0),
    status: text('status').notNull().default('enabled'),
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
    uniqueIndex('depts_name_unique_active')
      .on(table.name)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex('depts_code_unique_active')
      .on(table.code)
      .where(sql`${table.deletedAt} is null`),
    index('depts_parent_idx').on(table.parentId),
    index('depts_leader_idx').on(table.leaderId),
  ],
);

/**
 * posts（岗位表，详见 database-design.md §2.12）
 *
 * - 岗位是组织下的从属数据，删除组织前须先移除岗位（服务级校验，非数据库级联）。
 * - 同一组织下岗位名称部分唯一（未删除记录间）。
 */
export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    deptId: text('dept_id')
      .notNull()
      .references((): AnyPgColumn => depts.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    /** 岗位类别：management 管理岗 / professional 专业岗 / production 生产岗 */
    category: text('category').notNull().default('management'),
    /** 岗位职级（P1-P10 / M1-M5），空字符串表示未设置 */
    rank: text('rank').notNull().default(''),
    status: text('status').notNull().default('enabled'),
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
    uniqueIndex('posts_dept_name_unique_active')
      .on(table.deptId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index('posts_dept_idx').on(table.deptId),
  ],
);

/**
 * user_posts（用户 ↔ 岗位 桥接表，详见 database-design.md §2.13）
 *
 * - 一人多岗，其中 isMain=true 的为主岗（通讯录展示、公告推送范围用）。
 * - 岗位软删除时由服务层显式清理本表关联（软删不触发数据库级联）。
 */
export const userPosts = pgTable(
  'user_posts',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references((): AnyPgColumn => posts.id, { onDelete: 'cascade' }),
    /** 是否主岗 */
    isMain: boolean('is_main').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('user_posts_user_post_unique').on(table.userId, table.postId),
    index('user_posts_user_idx').on(table.userId),
    index('user_posts_post_idx').on(table.postId),
  ],
);
