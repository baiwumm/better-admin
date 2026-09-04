/**
 * 路由访问控制常量（与 React 端 route-access.ts 语义对齐）。
 *
 * 文件式路由（unplugin-vue-router）下 URL 由 src/pages/ 文件树生成；
 * 本文件集中声明「页面权限语义」，供全局前置守卫（src/router/guards.ts）读取：
 * - PUBLIC_PATHS：全屏公共页（登录页 / 错误页），不进认证布局
 * - LOGIN_REQUIRED_PATHS：登录即可访问，不参与菜单权限校验
 * - LOGIN_REQUIRED_PREFIXES：登录可达的动态路由前缀
 * - MENU_REQUIRED_PATHS：需要菜单权限校验的路径（其余认证页 = 登录即可）
 * - ROUTE_TITLE_KEYS：路径 → 文档标题 i18n 键（React route staticData.titleKey 等价物）
 */

/** 全屏公共页（不进认证布局，不需登录）。 */
export const PUBLIC_PATHS = ["/sign-in", "/403", "/404", "/500"] as const;

/** 「登录即可访问」的路径白名单：不参与菜单权限校验（后端不管理这些页面）。 */
export const LOGIN_REQUIRED_PATHS = ["/", "/account", "/my-notices"] as const;

/**
 * 「登录即可访问」的动态路由前缀：仅需登录态，不走菜单权限校验。
 *
 * 目前仅公告详情（/org/notices/:noticeId，通知消费入口）：站内信推送给
 * 发布范围内用户，接收者无需拥有公告管理菜单；可见性由详情接口服务端
 * 校验。前缀带尾斜杠，列表页 /org/notices 不在豁免范围（仍走菜单权限门卫）。
 */
export const LOGIN_REQUIRED_PREFIXES = ["/org/notices/"] as const;

/** 需要菜单权限校验的路径（新增受菜单管理的页面时在此登记）。 */
export const MENU_REQUIRED_PATHS = [
  "/org/depts",
  "/org/posts",
  "/org/directory",
  "/org/notices",
  "/org/chart",
  "/settings",
  "/settings/users",
  "/settings/roles",
  "/settings/permissions",
  "/settings/menus",
  "/settings/dicts",
  "/settings/logs",
] as const;

/** 路径 → 文档标题 i18n 键（menu.pageTitle.*）。 */
export const ROUTE_TITLE_KEYS: Record<string, string> = {
  "/": "menu.pageTitle.console",
  "/account": "menu.pageTitle.account",
  "/my-notices": "menu.pageTitle.myNotices",
  "/org/depts": "menu.pageTitle.depts",
  "/org/posts": "menu.pageTitle.posts",
  "/org/directory": "menu.pageTitle.directory",
  "/org/notices": "menu.pageTitle.notices",
  "/org/chart": "menu.pageTitle.chart",
  "/settings": "menu.pageTitle.settings",
  "/settings/users": "menu.pageTitle.users",
  "/settings/roles": "menu.pageTitle.roles",
  "/settings/permissions": "menu.pageTitle.permissions",
  "/settings/menus": "menu.pageTitle.menus",
  "/settings/dicts": "menu.pageTitle.dicts",
  "/settings/logs": "menu.pageTitle.logs",
};

/** 全屏公共页判定（App.vue 布局分支 + 守卫放行共用）。 */
export function isPublicPath(pathname: string): boolean {
  return (PUBLIC_PATHS as readonly string[]).includes(pathname);
}

/** 登录可达判定：精确白名单路径，或命中动态前缀（通知消费路由）。 */
export function isLoginRequiredPath(pathname: string): boolean {
  return (
    (LOGIN_REQUIRED_PATHS as readonly string[]).includes(pathname) ||
    LOGIN_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

/** 菜单权限校验判定。 */
export function isMenuRequiredPath(pathname: string): boolean {
  return (MENU_REQUIRED_PATHS as readonly string[]).includes(pathname);
}
