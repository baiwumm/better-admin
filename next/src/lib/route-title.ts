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
};

/** 获取路径的兜底元数据（无登记返回 undefined）。 */
export function getRouteStaticMeta(path: string): RouteStaticMeta | undefined {
  return ROUTE_STATIC_META_BY_PATH[path];
}

/** 获取路径的标题 i18n key（无登记返回 undefined）。 */
export function getRouteTitleKey(path: string): string | undefined {
  return ROUTE_STATIC_META_BY_PATH[path]?.titleKey;
}

/** 路径 → 兜底元数据的只读映射（兼容 React 版 Map 消费形态）。 */
export const routeStaticMetaByPath: ReadonlyMap<string, RouteStaticMeta> =
  new Map(Object.entries(ROUTE_STATIC_META_BY_PATH));
