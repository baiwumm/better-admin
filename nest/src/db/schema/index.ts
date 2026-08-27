// 注意：permissions.enum.ts 为非表模块（含 bigint 常量），若纳入本 barrel 会
// 触发 drizzle-kit 快照序列化 BigInt 失败。故表定义与权限枚举分别导出：
// - 本文件仅导出 drizzle 表定义（drizzle-kit 通过此 barrel 生成迁移）。
// - 权限枚举由各模块按需从 './permissions.enum' 直接导入。
export * from './users.schema';
export * from './refresh_tokens.schema';
export * from './roles.schema';
export * from './menus.schema';
export * from './user_roles.schema';
export * from './role_menus.schema';
export * from './dict_types.schema';
export * from './dict_items.schema';
export * from './settings.schema';
export * from './logs.schema';
