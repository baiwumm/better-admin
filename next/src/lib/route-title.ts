/**
 * 路由标题兜底映射：为「不在菜单树中的路由」（登录白名单页等）提供标题来源，
 * 与页面标题 hook / 面包屑 / 标签栏取词同源（同一套 i18n key）。
 *
 * Next 适配：React 版经 router.routesByPath 读取 TanStack Router 的
 * staticData.titleKey；App Router 无该机制，改为手写静态映射表——
 * 新增非菜单路由时在此登记（菜单路由无需登记，标题来自菜单树）。
 */

const ROUTE_TITLE_KEY_BY_PATH: Record<string, string> = {
  // 登录白名单页（不在菜单树中的管理区路由）
  "/account": "menu.pageTitle.account",
};

/** 获取路径的标题 i18n key（无登记返回 undefined）。 */
export function getRouteTitleKey(path: string): string | undefined {
  return ROUTE_TITLE_KEY_BY_PATH[path];
}

/** 路径 → 标题 i18n key 的只读映射（兼容 React 版 Map 消费形态）。 */
export const routeTitleKeyByPath: ReadonlyMap<string, string> = new Map(
  Object.entries(ROUTE_TITLE_KEY_BY_PATH),
);
