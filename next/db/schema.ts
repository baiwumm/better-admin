import {
  pgTable,
  type AnyPgColumn,
  uniqueIndex,
  foreignKey,
  text,
  timestamp,
  integer,
  date,
  index,
  boolean,
  bigint,
  unique,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: text().primaryKey().notNull(),
    username: text().notNull(),
    email: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    avatar: text(),
    status: text().default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    tokenVersion: integer("token_version").default(0).notNull(),
    phone: text(),
    tags: text().array(),
    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
      mode: "string",
    }),
    website: text(),
    githubUsername: text("github_username"),
    xUsername: text("x_username"),
    deptId: text("dept_id").references((): AnyPgColumn => depts.id),
    employeeNo: text("employee_no"),
    employmentStatus: text("employment_status"),
    entryDate: date("entry_date"),
  },
  (table) => [
    uniqueIndex("users_email_unique_active")
      .using("btree", table.email.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
    uniqueIndex("users_username_unique_active")
      .using("btree", table.username.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
  ],
);

export const menus = pgTable(
  "menus",
  {
    id: text().primaryKey().notNull(),
    label: text().notNull(),
    i18NKey: text("i18n_key"),
    icon: text().notNull(),
    to: text(),
    badge: text(),
    parentId: text("parent_id"),
    sort: integer().default(0).notNull(),
    keepAlive: boolean("keep_alive").default(false).notNull(),
    hideInMenu: boolean("hide_in_menu").default(false).notNull(),
    enabled: boolean().default(true).notNull(),
    defaultOpen: boolean("default_open").default(false).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    permissions: bigint({ mode: "number" }).default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("menus_parent_idx").using(
      "btree",
      table.parentId.asc().nullsLast().op("text_ops"),
    ),
    index("menus_sort_idx").using(
      "btree",
      table.parentId.asc().nullsLast().op("text_ops"),
      table.sort.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("menus_to_unique")
      .using("btree", table.to.asc().nullsLast().op("text_ops"))
      .where(sql`("to" IS NOT NULL)`),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "menus_parent_id_menus_id_fk",
    }).onDelete("restrict"),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    code: text().notNull(),
    description: text(),
    enabled: boolean().default(true).notNull(),
    sort: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("roles_code_unique").using(
      "btree",
      table.code.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("roles_name_unique").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const dictTypes = pgTable(
  "dict_types",
  {
    id: text().primaryKey().notNull(),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("dict_types_code_unique").on(table.code)],
);

export const dictItems = pgTable(
  "dict_items",
  {
    id: text().primaryKey().notNull(),
    typeCode: text("type_code").notNull(),
    value: text().notNull(),
    label: text().notNull(),
    i18NKey: text("i18n_key"),
    sort: integer().default(0).notNull(),
    enabled: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("dict_items_type_value_unique").using(
      "btree",
      table.typeCode.asc().nullsLast().op("text_ops"),
      table.value.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.typeCode],
      foreignColumns: [dictTypes.code],
      name: "dict_items_type_code_dict_types_code_fk",
    }).onDelete("cascade"),
  ],
);

export const logs = pgTable(
  "logs",
  {
    id: text().primaryKey().notNull(),
    type: text().notNull(),
    userId: text("user_id"),
    action: text().notNull(),
    ip: text(),
    userAgent: text("user_agent"),
    detail: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("logs_created_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("logs_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "logs_user_id_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("refresh_tokens_token_hash_unique").using(
      "btree",
      table.tokenHash.asc().nullsLast().op("text_ops"),
    ),
    index("refresh_tokens_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "refresh_tokens_user_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const depts = pgTable(
  "depts",
  {
    id: text().primaryKey().notNull(),
    parentId: text("parent_id"),
    name: text().notNull(),
    code: text(),
    leaderId: text("leader_id"),
    sort: integer().default(0).notNull(),
    status: text().default("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("depts_code_unique_active")
      .using("btree", table.code.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("depts_leader_idx").using(
      "btree",
      table.leaderId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("depts_name_unique_active")
      .using("btree", table.name.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("depts_parent_idx").using(
      "btree",
      table.parentId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.leaderId],
      foreignColumns: [users.id],
      name: "depts_leader_id_users_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "depts_parent_id_depts_id_fk",
    }).onDelete("restrict"),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: text().primaryKey().notNull(),
    deptId: text("dept_id").notNull(),
    name: text().notNull(),
    category: text().default("management").notNull(),
    rank: text().default("").notNull(),
    status: text().default("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("posts_dept_idx").using(
      "btree",
      table.deptId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("posts_dept_name_unique_active")
      .using(
        "btree",
        table.deptId.asc().nullsLast().op("text_ops"),
        table.name.asc().nullsLast().op("text_ops"),
      )
      .where(sql`(deleted_at IS NULL)`),
    foreignKey({
      columns: [table.deptId],
      foreignColumns: [depts.id],
      name: "posts_dept_id_depts_id_fk",
    }).onDelete("restrict"),
  ],
);

export const userPosts = pgTable(
  "user_posts",
  {
    id: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    postId: text("post_id").notNull(),
    isMain: boolean("is_main").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_posts_post_idx").using(
      "btree",
      table.postId.asc().nullsLast().op("text_ops"),
    ),
    index("user_posts_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.postId],
      foreignColumns: [posts.id],
      name: "user_posts_post_id_posts_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_posts_user_id_users_id_fk",
    }).onDelete("cascade"),
    unique("user_posts_user_post_unique").on(table.userId, table.postId),
  ],
);

export const notices = pgTable(
  "notices",
  {
    id: text().primaryKey().notNull(),
    title: text().notNull(),
    content: text().notNull(),
    publisherId: text("publisher_id"),
    isTop: boolean("is_top").default(false).notNull(),
    status: text().default("draft").notNull(),
    publishTime: timestamp("publish_time", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("notices_publish_scan_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
      table.publishTime.asc().nullsLast().op("text_ops"),
    ),
    index("notices_publisher_idx").using(
      "btree",
      table.publisherId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.publisherId],
      foreignColumns: [users.id],
      name: "notices_publisher_id_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const noticeReadRecords = pgTable(
  "notice_read_records",
  {
    id: text().primaryKey().notNull(),
    noticeId: text("notice_id").notNull(),
    userId: text("user_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    ipAddress: text("ip_address").default("").notNull(),
  },
  (table) => [
    index("notice_read_records_notice_idx").using(
      "btree",
      table.noticeId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.noticeId],
      foreignColumns: [notices.id],
      name: "notice_read_records_notice_id_notices_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "notice_read_records_user_id_users_id_fk",
    }).onDelete("cascade"),
    unique("notice_read_records_notice_user_unique").on(
      table.noticeId,
      table.userId,
    ),
  ],
);

export const noticeRemindLogs = pgTable(
  "notice_remind_logs",
  {
    id: text().primaryKey().notNull(),
    noticeId: text("notice_id").notNull(),
    remindedBy: text("reminded_by").notNull(),
    remindedAt: timestamp("reminded_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notice_remind_logs_notice_idx").using(
      "btree",
      table.noticeId.asc().nullsLast().op("text_ops"),
      table.remindedAt.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.noticeId],
      foreignColumns: [notices.id],
      name: "notice_remind_logs_notice_id_notices_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.remindedBy],
      foreignColumns: [users.id],
      name: "notice_remind_logs_reminded_by_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const noticeScopes = pgTable(
  "notice_scopes",
  {
    id: text().primaryKey().notNull(),
    noticeId: text("notice_id").notNull(),
    scopeType: text("scope_type").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notice_scopes_notice_idx").using(
      "btree",
      table.noticeId.asc().nullsLast().op("text_ops"),
    ),
    index("notice_scopes_target_idx").using(
      "btree",
      table.scopeType.asc().nullsLast().op("text_ops"),
      table.targetId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.noticeId],
      foreignColumns: [notices.id],
      name: "notice_scopes_notice_id_notices_id_fk",
    }).onDelete("cascade"),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text().primaryKey().notNull(),
    recipientId: text("recipient_id").notNull(),
    type: text().default("system").notNull(),
    title: text().notNull(),
    content: text(),
    link: text(),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_recipient_idx").using(
      "btree",
      table.recipientId.asc().nullsLast().op("text_ops"),
      table.readAt.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.recipientId],
      foreignColumns: [users.id],
      name: "notifications_recipient_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id").notNull(),
    roleId: text("role_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_roles_role_idx").using(
      "btree",
      table.roleId.asc().nullsLast().op("text_ops"),
    ),
    index("user_roles_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "user_roles_role_id_roles_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_roles_user_id_users_id_fk",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.userId, table.roleId],
      name: "user_roles_user_id_role_id_pk",
    }),
  ],
);

export const roleMenus = pgTable(
  "role_menus",
  {
    roleId: text("role_id").notNull(),
    menuId: text("menu_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    permissions: bigint({ mode: "number" }).default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("role_menus_menu_idx").using(
      "btree",
      table.menuId.asc().nullsLast().op("text_ops"),
    ),
    index("role_menus_role_idx").using(
      "btree",
      table.roleId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.menuId],
      foreignColumns: [menus.id],
      name: "role_menus_menu_id_menus_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "role_menus_role_id_roles_id_fk",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.roleId, table.menuId],
      name: "role_menus_role_id_menu_id_pk",
    }),
  ],
);
