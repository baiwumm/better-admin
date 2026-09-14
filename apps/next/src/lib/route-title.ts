/**
 * 路由标题兜底映射：为「不在菜单树中的路由」（登录白名单页等）提供标题与
 * 图标来源，与页面标题 hook / 面包屑 / 标签栏取词同源（同一套 i18n key）。
 *
 * Next 适配：React 版经 router.routesByPath 读取 TanStack Router 的
 * staticData（titleKey / icon）；App Router 无该机制，改为手写静态映射表——
 * 新增非菜单路由时在此登记（菜单路由无需登记，标题与图标来自菜单树）。
 * 图标取 lucide kebab-case 名（与 React 端路由 staticData.icon 同口径，
 * 如 /account 与用户下拉菜单「我的账户」入口一致）。
 */

/** staticData 兜底元数据：标题 i18n key 与图标名（与 React 版 RouteStaticMeta 同构）。 */
export type RouteStaticMeta = {
  titleKey: string;
  icon?: string;
};

const ROUTE_STATIC_META_BY_PATH: Record<string, RouteStaticMeta> = {
  // 登录白名单页（不在菜单树中的管理区路由）
  "/account": {
    titleKey: "menu.pageTitle.account",
    // 与用户下拉菜单「我的账户」入口一致（IdCard）
    icon: "id-card",
  },
  "/my-notices": {
    titleKey: "menu.pageTitle.myNotices",
    // 与用户下拉菜单「我的站内信」入口一致（BellRing）
    icon: "bell-ring",
  },
  // 布局内异常页（与 React 端 staticData 同 key；全屏错误页 /403 /404 /500
  // 的标题由各页 generateMetadata 以 errors.*.title 提供，不经本映射）
  "/exception/403": {
    titleKey: "menu.exception.403",
  },
  "/exception/404": {
    titleKey: "menu.exception.404",
  },
  "/exception/500": {
    titleKey: "menu.exception.500",
  },
  // 动态路由：键为 App Router 模板路径，查询经 findRouteStaticMeta 做动态段
  // 模板匹配（对齐 React 端 TanStack 路由 staticData 的匹配语义）。/org/notices
  // 是登录可达的消费路由（不走菜单权限），详情页与列表页同 titleKey
  "/org/notices/[noticeId]": {
    titleKey: "menu.pageTitle.notices",
  },
};

/** 单段模板匹配：pattern 段为 [param] 时匹配任意非空段，其余段须精确相等。 */
function matchRouteTemplate(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (patternSegments.length !== pathSegments.length) return false;

  return patternSegments.every(
    (segment, index) =>
      segment.startsWith("[") || segment === pathSegments[index],
  );
}

/** 查询路径的兜底元数据：精确命中，未命中按动态段模板匹配
 * （/org/notices/x → [noticeId]，对齐 React 端 findRouteStaticMeta）。 */
export function findRouteStaticMeta(path: string): RouteStaticMeta | undefined {
  const exact = ROUTE_STATIC_META_BY_PATH[path];

  if (exact !== undefined) return exact;

  for (const [pattern, meta] of Object.entries(ROUTE_STATIC_META_BY_PATH)) {
    if (matchRouteTemplate(pattern, path)) return meta;
  }

  return undefined;
}

/** 获取路径的兜底元数据（无登记返回 undefined）。 */
export function getRouteStaticMeta(path: string): RouteStaticMeta | undefined {
  return findRouteStaticMeta(path);
}

/** 获取路径的标题 i18n key（无登记返回 undefined）。 */
export function getRouteTitleKey(path: string): string | undefined {
  return findRouteStaticMeta(path)?.titleKey;
}

/** 路径 → 兜底元数据的只读映射（兼容 React 版 Map 消费形态；仅精确键，
 * 动态路由消费方请改用 findRouteStaticMeta）。 */
export const routeStaticMetaByPath: ReadonlyMap<string, RouteStaticMeta> =
  new Map(Object.entries(ROUTE_STATIC_META_BY_PATH));
