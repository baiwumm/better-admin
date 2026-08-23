/**
 * 路由路径字典：Better Admin 业务路由的唯一真源（kebab-case）。
 * 约定：文件路由的 path、后端菜单的 to 字段、此字典三者必须保持一致。
 */
export const ROUTE_PATHS = {
  dashboard: "/",
  signIn: "/sign-in",
  error403: "/403",
  error404: "/404",
  error500: "/500",
  settings: "/settings",
  settingsUsers: "/settings/users",
  settingsRoles: "/settings/roles",
  settingsPermissions: "/settings/permissions",
  settingsMenus: "/settings/menus",
  settingsDicts: "/settings/dicts",
  settingsLogs: "/settings/logs",
  account: "/account",
} as const;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
