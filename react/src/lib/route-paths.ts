/**
 * 路由路径字典：Better Admin 业务路由的唯一真源（kebab-case）。
 * 约定：文件路由的 path、后端菜单的 to 字段、此字典三者必须保持一致。
 */
export const ROUTE_PATHS = {
  dashboard: "/",
  signIn: "/sign-in",
  unauthorized: "/401",
  forbidden: "/403",
  notFound: "/404",
  users: "/users",
  roles: "/roles",
  permissions: "/permissions",
  menus: "/menus",
  logs: "/logs",
  settings: "/settings",
  settingsProfile: "/settings/profile",
  settingsAccount: "/settings/account",
  settingsAppearance: "/settings/appearance",
  settingsNotifications: "/settings/notifications",
  settingsDisplay: "/settings/display",
  multiLevel: "/multi-level",
} as const;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
