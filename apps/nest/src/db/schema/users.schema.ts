import { nanoid } from 'nanoid';
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  date,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { depts } from './org.schema';

/**
 * users（用户表，详见 database-design.md §2.1）
 *
 * - 主键 id 由服务端 nanoid(12) 生成。
 * - 软删除使用 deletedAt（timestamptz, nullable）。
 * - username / email 采用部分唯一索引：仅对未删除记录（deleted_at IS NULL）
 *   施加唯一约束，已软删记录可释放用户名/邮箱供复用。
 */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    avatar: text('avatar'),
    /** 电话（v1.5.0，可空；自助修改走 Account 模块） */
    phone: text('phone'),
    /**
     * 个人标签（v1.5.0，text[] 可空；用户在「我的账户」自助维护，
     * 服务端逐项 trim、去重，单项 1-20 字符、最多 10 个）
     */
    tags: text('tags').array(),
    /** 最近一次登录成功时间（v1.5.0，登录成功时写入；从未登录为 null） */
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    /**
     * 个人网站裸域名（v1.5.2，如 baidu.com，可带路径，不带协议）；
     * 展示 URL 前缀 https:// 由前端统一拼接
     */
    website: text('website'),
    /** GitHub 用户名裸值（v1.5.2，如 baiwumm）；展示前缀 https://github.com/ 由前端拼接 */
    githubUsername: text('github_username'),
    /** X（Twitter）用户名裸值（v1.5.2，如 baiwumm）；展示前缀 https://x.com/ 由前端拼接 */
    xUsername: text('x_username'),
    /**
     * 所属组织 ID（v1.6.0，可空向前兼容；组织中心模块）。
     * 与 depts.leader_id 形成循环引用，采用 AnyPgColumn 惰性回调声明外键。
     */
    deptId: text('dept_id').references((): AnyPgColumn => depts.id, {
      onDelete: 'set null',
    }),
    /** 工号（v1.6.0，可空向前兼容；人员通讯录展示 / 搜索用） */
    employeeNo: text('employee_no'),
    /**
     * 在职状态（v1.6.0，可空向前兼容；employed 在职 / resigned 离职）。
     * 与账号启停 status（active/disabled）正交；存量 null 值按在职（employed）处理。
     */
    employmentStatus: text('employment_status'),
    /** 入职日期（v1.6.0，可空向前兼容；人员通讯录展示用） */
    entryDate: date('entry_date', { mode: 'string' }),
    /** 性别（v1.6.0 阶段 2 补充，可空向前兼容；male 男 / female 女，null = 未设置） */
    gender: text('gender'),
    status: text('status').notNull().default('active'),
    /**
     * 令牌版本号：签发 JWT 时写入 payload（ver claim）。
     * 改密码 / 封禁时 +1，使该用户全部存量 access/refresh token 失效（全端强制下线）。
     */
    tokenVersion: integer('token_version').notNull().default(0),
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
    uniqueIndex('users_username_unique_active')
      .on(table.username)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex('users_email_unique_active')
      .on(table.email)
      .where(sql`${table.deletedAt} is null`),
  ],
);
