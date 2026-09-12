/**
 * 路由访问控制常量（与 React 端 route-access.ts 语义对齐）。
 *
 * 文件式路由（unplugin-vue-router）下 URL 由 src/pages/ 文件树生成；
 * 本文件集中声明「页面权限语义」，供全局前置守卫（src/router/guards.ts）读取：
 * - PUBLIC_PATHS：无需登录的公共页（仅登录页）
 * - FULLSCREEN_PATHS：不套 AdminLayout 的全屏页（登录页 + 独立错误页）
 * - LOGIN_REQUIRED_PATHS：登录即可访问，不参与菜单权限校验
 * - LOGIN_REQUIRED_PREFIXES：登录可达的动态路由前缀
 * - MENU_REQUIRED_PATHS：需要菜单权限校验的路径（其余认证页 = 登录即可）
 * - ROUTE_TITLE_KEYS：路径 → 文档标题 i18n 键（React route staticData.titleKey 等价物）
 */

/**
 * 无需登录的公共页（守卫放行）：仅登录页。
 *
 * 独立错误页（/403 /404 /500）**要求登录**——对齐 React 端各路由 `beforeLoad`
 * 与 Next 端 `proxy.ts`：未登录访问一律 `/sign-in?redirect=<原路径>`，错误页不再
 * 匿名可见。它们仍属 FULLSCREEN_PATHS（不套 AdminLayout）：
 * 「是否要求登录」与「是否全屏渲染」是两个独立维度，两个集合不可合并。
 */
export const PUBLIC_PATHS = ['/sign-in'] as const

/**
 * 全屏页（渲染于 AdminLayout / AuthLayout 之外）：登录页 + 独立错误页。
 * 供布局分支（AppShell）与路由过渡编排（KeepAliveOutlet）共用；
 * catch-all 404 由路由 name 单独判定，不在此表。
 */
export const FULLSCREEN_PATHS = ['/sign-in', '/403', '/404', '/500'] as const

/** 「登录即可访问」的路径白名单：不参与菜单权限校验（后端不管理这些页面）。 */
export const LOGIN_REQUIRED_PATHS = ['/', '/account', '/my-notices'] as const

/**
 * 「登录即可访问」的动态路由前缀：仅需登录态，不走菜单权限校验。
 *
 * 目前仅公告详情（/org/notices/:noticeId，通知消费入口）：站内信推送给
 * 发布范围内用户，接收者无需拥有公告管理菜单；可见性由详情接口服务端
 * 校验。前缀带尾斜杠，列表页 /org/notices 不在豁免范围（仍走菜单权限门卫）。
 */
export const LOGIN_REQUIRED_PREFIXES = ['/org/notices/'] as const

/** 需要菜单权限校验的路径（新增受菜单管理的页面时在此登记）。 */
export const MENU_REQUIRED_PATHS = [
  '/org/depts',
  '/org/posts',
  '/org/directory',
  '/org/notices',
  '/org/chart',
  '/settings',
  '/settings/users',
  '/settings/roles',
  '/settings/permissions',
  '/settings/menus',
  '/settings/dicts',
  '/settings/logs'
] as const

/** 路径 → 文档标题 i18n 键（menu.pageTitle.* / exception 页用 menu.exception.*）。 */
export const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/': 'menu.pageTitle.console',
  '/sign-in': 'auth.signIn.title',
  // 独立全屏错误页：与 React 端各路由 staticData.titleKey 同键（errors.*.title，
  // 即错误页正文标题本身），此前缺失导致文档标题回退为裸品牌名。
  '/403': 'errors.forbidden.title',
  '/404': 'errors.notFound.title',
  '/500': 'errors.serverError.title',
  '/account': 'menu.pageTitle.account',
  '/my-notices': 'menu.pageTitle.myNotices',
  '/org/depts': 'menu.pageTitle.depts',
  '/org/posts': 'menu.pageTitle.posts',
  '/org/directory': 'menu.pageTitle.directory',
  '/org/notices': 'menu.pageTitle.notices',
  '/org/chart': 'menu.pageTitle.chart',
  '/exception/403': 'menu.exception.403',
  '/exception/404': 'menu.exception.404',
  '/exception/500': 'menu.exception.500',
  '/settings': 'menu.pageTitle.settings',
  '/settings/users': 'menu.pageTitle.users',
  '/settings/roles': 'menu.pageTitle.roles',
  '/settings/permissions': 'menu.pageTitle.permissions',
  '/settings/menus': 'menu.pageTitle.menus',
  '/settings/dicts': 'menu.pageTitle.dicts',
  '/settings/logs': 'menu.pageTitle.logs'
}

/**
 * 路径 → 标签栏图标（React 端 route staticData.icon 的等价物）。
 *
 * 仅为「不在菜单树中的登录白名单页」登记（菜单路由图标来自菜单树，
 * tabs 快照亦无这些路径的图标来源）；图标取 lucide kebab-case 名
 * （与 React / Next 端同口径），标签栏消费时自行拼 `i-lucide-` 前缀。
 * 与用户下拉菜单入口图标保持一致（IdCard / BellRing）。
 */
export const ROUTE_TAB_ICONS: Record<string, string> = {
  '/account': 'id-card',
  '/my-notices': 'bell-ring'
}

/** 解析路径的标签栏图标名（无登记返回 undefined；TagsBar 拼 i-lucide- 前缀）。 */
export function resolveRouteTabIcon(pathname: string): string | undefined {
  return ROUTE_TAB_ICONS[pathname]
}

/** 公共页判定（守卫放行：无需登录）。 */
export function isPublicPath(pathname: string): boolean {
  return (PUBLIC_PATHS as readonly string[]).includes(pathname)
}

/** 全屏页判定（不套 AdminLayout；布局分支与路由过渡编排共用）。 */
export function isFullscreenPath(pathname: string): boolean {
  return (FULLSCREEN_PATHS as readonly string[]).includes(pathname)
}

/**
 * 动态路由前缀 → 文档标题 i18n 键（精确匹配未命中时按最长前缀匹配）。
 * 目前仅公告详情消费路由：React 端 notices_.$noticeId 的 titleKey 与
 * 列表页同键（menu.pageTitle.notices），此处保持同口径。
 */
export const ROUTE_TITLE_PREFIX_KEYS: Record<string, string> = {
  '/org/notices/': 'menu.pageTitle.notices'
}

/** 解析路径的文档标题键：精确匹配优先，其次最长前缀（文档标题与面包屑共用）。 */
export function resolveRouteTitleKey(pathname: string): string | undefined {
  const exact = ROUTE_TITLE_KEYS[pathname]

  if (exact) return exact

  let matched: string | undefined
  let matchedLength = 0

  for (const [prefix, key] of Object.entries(ROUTE_TITLE_PREFIX_KEYS)) {
    if (pathname.startsWith(prefix) && prefix.length > matchedLength) {
      matched = key
      matchedLength = prefix.length
    }
  }

  return matched
}

/**
 * 认证布局路径（对应 React 端 (auth) 路由组）：
 * 整页格子背景 + 品牌区 + 表单卡片的统一外壳（AuthLayout）。
 * 新增注册 / 忘记密码等认证页时在此登记。
 */
export const AUTH_LAYOUT_PATHS = ['/sign-in'] as const

/** 认证布局判定（AppShell 布局分支用）。 */
export function isAuthLayoutPath(pathname: string): boolean {
  return (AUTH_LAYOUT_PATHS as readonly string[]).includes(pathname)
}

/**
 * 认证态布局（AdminLayout）判定：非全屏页且非 catch-all 404（对应 React 端
 * _authenticated 路由组）。路由过渡编排（仅布局内的页面切换才播放主体区动画）
 * 等场景共用同一口径；页面布局分支本身由 Nuxt layouts 机制承担（M0：
 * app/layouts/{admin,auth,empty}.vue + definePageMeta layout）。
 *
 * 判据是「是否全屏」而非「是否需要登录」：独立错误页要求登录（守卫层拦截），
 * 但登录后依然全屏渲染，不得套 AdminLayout。
 * catch-all 404 判定：Vue 端为 route.name !== "/[...all]"（unplugin-vue-router
 * 路由名）；Nuxt 文件式路由无该命名约定，改为页面级 meta 标记
 * （app/pages/[...slug].vue 的 definePageMeta({ fullscreenError: true })）。
 */
export function isAdminLayoutRoute(route: {
  path: string
  meta?: { fullscreenError?: boolean }
}): boolean {
  return !isFullscreenPath(route.path) && route.meta?.fullscreenError !== true
}

/** 登录可达判定：精确白名单路径，或命中动态前缀（通知消费路由）。 */
export function isLoginRequiredPath(pathname: string): boolean {
  return (
    (LOGIN_REQUIRED_PATHS as readonly string[]).includes(pathname)
    || LOGIN_REQUIRED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  )
}

/** 菜单权限校验判定。 */
export function isMenuRequiredPath(pathname: string): boolean {
  return (MENU_REQUIRED_PATHS as readonly string[]).includes(pathname)
}
