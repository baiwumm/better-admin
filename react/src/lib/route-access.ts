/**
 * 路由访问控制常量（替代原 ROUTE_PATHS 手写字典，见 AGENTS.md §7.2 浮层/路由规范）。
 *
 * 说明：
 * - 业务路由路径由 TanStack Router 从 src/routes/ 文件结构自动生成（routeTree.gen.ts），
 *   组件内跳转直接使用类型安全的字面量 to（如 navigate({ to: "/sign-in" })），
 *   不再手动维护中央路径字典。
 * - 仅保留「登录即可访问」的语义白名单等访问控制常量。
 */

/** 「登录即可访问」的路径白名单：不参与菜单权限校验（后端不管理这些页面）。 */
export const LOGIN_REQUIRED_PATHS = ["/", "/account"] as const;