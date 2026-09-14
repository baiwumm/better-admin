import { nanoid } from 'nanoid';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  unique,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * notices（公告表，详见 database-design.md §2.14，阶段 3 实现）
 *
 * - status: draft 草稿 / published 已发布 / withdrawn 已撤回；
 *   定时任务每分钟扫描 publish_time <= now() 且 status='draft' 的公告自动发布。
 * - 软删除使用 deletedAt。
 */
export const notices = pgTable(
  'notices',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    title: text('title').notNull(),
    /** 富文本内容（Tiptap HTML，渲染端须消毒防 XSS） */
    content: text('content').notNull(),
    /** 发布人；发布人被删除时置空（软删用户不受影响） */
    publisherId: text('publisher_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    isTop: boolean('is_top').notNull().default(false),
    status: text('status').notNull().default('draft'),
    /** 发布时间（支持定时发布；撤回后再次发布时更新） */
    publishTime: timestamp('publish_time', { withTimezone: true }).notNull(),
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
    index('notices_publish_scan_idx').on(table.status, table.publishTime),
    index('notices_publisher_idx').on(table.publisherId),
  ],
);

/**
 * notice_scopes（公告范围表，详见 database-design.md §2.15，阶段 3 实现）
 *
 * - scopeType: dept 按组织 / post 按岗位 / user 按具体人员；同一公告多条记录取并集。
 * - 只存范围记录（不按人展开），可见人群与已读率在查询时动态解析。
 */
export const noticeScopes = pgTable(
  'notice_scopes',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    noticeId: text('notice_id')
      .notNull()
      .references((): AnyPgColumn => notices.id, { onDelete: 'cascade' }),
    scopeType: text('scope_type').notNull(),
    /** 目标 ID：组织 ID / 岗位 ID / 用户 ID */
    targetId: text('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('notice_scopes_notice_idx').on(table.noticeId),
    index('notice_scopes_target_idx').on(table.scopeType, table.targetId),
  ],
);

/**
 * notice_read_records（公告阅读记录表，详见 database-design.md §2.16，阶段 3 实现）
 *
 * - 进入详情页即记录，同一用户同一公告仅记首次阅读时间（唯一约束）。
 * - 阅读记录不可篡改：用户离职后保留（不可篡改语义由仅新增（append-only）、不提供编辑接口保障）。
 */
export const noticeReadRecords = pgTable(
  'notice_read_records',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    noticeId: text('notice_id')
      .notNull()
      .references((): AnyPgColumn => notices.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 首次阅读时间 */
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
    /** 阅读时的 IP 地址 */
    ipAddress: text('ip_address').notNull().default(''),
  },
  (table) => [
    unique('notice_read_records_notice_user_unique').on(
      table.noticeId,
      table.userId,
    ),
    index('notice_read_records_notice_idx').on(table.noticeId),
  ],
);

/**
 * notice_remind_logs（公告催办记录表，详见 database-design.md §2.17，阶段 3 实现）
 *
 * - 一键催办时写入，用于「24 小时内不可重复催办」限制与催办历史追溯。
 */
export const noticeRemindLogs = pgTable(
  'notice_remind_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    noticeId: text('notice_id')
      .notNull()
      .references((): AnyPgColumn => notices.id, { onDelete: 'cascade' }),
    /** 催办操作人 */
    remindedBy: text('reminded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    remindedAt: timestamp('reminded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('notice_remind_logs_notice_idx').on(table.noticeId, table.remindedAt),
  ],
);

/**
 * notifications（站内信表，详见 database-design.md §2.18，阶段 3 实现）
 *
 * - 顶栏铃铛的数据源：recipientId 为 null 的广播消息（预留）或指定收件人的点对点消息。
 * - type 预留：notice_remind 公告催办 / notice_publish 新公告 / system 系统消息等。
 */
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('system'),
    title: text('title').notNull(),
    content: text('content'),
    /** 点击跳转的前端路由（可空） */
    link: text('link'),
    /** 已读时间；null 表示未读 */
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('notifications_recipient_idx').on(table.recipientId, table.readAt),
  ],
);
