import { relations } from "drizzle-orm/relations";

import {
  depts,
  users,
  menus,
  dictTypes,
  dictItems,
  logs,
  refreshTokens,
  posts,
  userPosts,
  notices,
  noticeReadRecords,
  noticeRemindLogs,
  noticeScopes,
  notifications,
  roles,
  userRoles,
  roleMenus,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  dept: one(depts, {
    fields: [users.deptId],
    references: [depts.id],
    relationName: "users_deptId_depts_id",
  }),
  logs: many(logs),
  refreshTokens: many(refreshTokens),
  depts: many(depts, {
    relationName: "depts_leaderId_users_id",
  }),
  userPosts: many(userPosts),
  notices: many(notices),
  noticeReadRecords: many(noticeReadRecords),
  noticeRemindLogs: many(noticeRemindLogs),
  notifications: many(notifications),
  userRoles: many(userRoles),
}));

export const deptsRelations = relations(depts, ({ one, many }) => ({
  users: many(users, {
    relationName: "users_deptId_depts_id",
  }),
  user: one(users, {
    fields: [depts.leaderId],
    references: [users.id],
    relationName: "depts_leaderId_users_id",
  }),
  dept: one(depts, {
    fields: [depts.parentId],
    references: [depts.id],
    relationName: "depts_parentId_depts_id",
  }),
  depts: many(depts, {
    relationName: "depts_parentId_depts_id",
  }),
  posts: many(posts),
}));

export const menusRelations = relations(menus, ({ one, many }) => ({
  menu: one(menus, {
    fields: [menus.parentId],
    references: [menus.id],
    relationName: "menus_parentId_menus_id",
  }),
  menus: many(menus, {
    relationName: "menus_parentId_menus_id",
  }),
  roleMenus: many(roleMenus),
}));

export const dictItemsRelations = relations(dictItems, ({ one }) => ({
  dictType: one(dictTypes, {
    fields: [dictItems.typeCode],
    references: [dictTypes.code],
  }),
}));

export const dictTypesRelations = relations(dictTypes, ({ many }) => ({
  dictItems: many(dictItems),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  user: one(users, {
    fields: [logs.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  dept: one(depts, {
    fields: [posts.deptId],
    references: [depts.id],
  }),
  userPosts: many(userPosts),
}));

export const userPostsRelations = relations(userPosts, ({ one }) => ({
  post: one(posts, {
    fields: [userPosts.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [userPosts.userId],
    references: [users.id],
  }),
}));

export const noticesRelations = relations(notices, ({ one, many }) => ({
  user: one(users, {
    fields: [notices.publisherId],
    references: [users.id],
  }),
  noticeReadRecords: many(noticeReadRecords),
  noticeRemindLogs: many(noticeRemindLogs),
  noticeScopes: many(noticeScopes),
}));

export const noticeReadRecordsRelations = relations(
  noticeReadRecords,
  ({ one }) => ({
    notice: one(notices, {
      fields: [noticeReadRecords.noticeId],
      references: [notices.id],
    }),
    user: one(users, {
      fields: [noticeReadRecords.userId],
      references: [users.id],
    }),
  }),
);

export const noticeRemindLogsRelations = relations(
  noticeRemindLogs,
  ({ one }) => ({
    notice: one(notices, {
      fields: [noticeRemindLogs.noticeId],
      references: [notices.id],
    }),
    user: one(users, {
      fields: [noticeRemindLogs.remindedBy],
      references: [users.id],
    }),
  }),
);

export const noticeScopesRelations = relations(noticeScopes, ({ one }) => ({
  notice: one(notices, {
    fields: [noticeScopes.noticeId],
    references: [notices.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  roleMenus: many(roleMenus),
}));

export const roleMenusRelations = relations(roleMenus, ({ one }) => ({
  menu: one(menus, {
    fields: [roleMenus.menuId],
    references: [menus.id],
  }),
  role: one(roles, {
    fields: [roleMenus.roleId],
    references: [roles.id],
  }),
}));
