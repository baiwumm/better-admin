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

/**
 * 「登录即可访问」的动态路由前缀：仅需登录态，不走菜单权限校验。
 *
 * 目前仅公告详情（/org/notices/:noticeId，通知消费入口）：站内信推送给
 * 发布范围内用户，接收者无需拥有公告管理菜单；可见性由详情接口服务端
 * 校验（super_admin / SEARCH 位 / 发布范围内，NestJS 与 Next 端同款）。
 * 前缀带尾斜杠，列表页 /org/notices 不在豁免范围（仍走菜单权限门卫）。
 */
export const LOGIN_REQUIRED_PREFIXES = ["/org/notices/"] as const;

/** 登录可达判定：精确白名单路径，或命中动态前缀（通知消费路由）。 */
export function isLoginRequiredPath(pathname: string): boolean {
  return (
    (LOGIN_REQUIRED_PATHS as readonly string[]).includes(pathname) ||
    LOGIN_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}
