/**
 * 路由 staticData 兜底工具：为「不在菜单树中的路由」（登录白名单页、
 * 通知详情等动态路由）提供标题与图标的兜底来源，与 useDocumentTitle
 * 取词同源（同一套 i18n key）。图标兜底条件与标题一致：菜单树 /
 * tabs 快照均无该路径时使用（如 /account、/my-notices 登录即可达、
 * 不在菜单权限体系，图标取与用户下拉菜单入口一致的 lucide 图标名）。
 */

import { matchRoutePattern } from "@/lib/route-component";

/** staticData 兜底元数据：标题 i18n key 与图标名。 */
export type RouteStaticMeta = {
  titleKey: string;
  icon?: string;
};

/**
 * 构建「路由 fullPath → staticData 兜底元数据」映射。
 * 入参用结构化类型（仅依赖 routesByPath），便于独立单测与复用；
 * routesByPath 声明为 object（生成的 FileRoutesByFullPath 无字符串索引签名，
 * 不能赋给 Record<string, unknown>）。注意：staticData 声明在路由 options 中，
 * 运行时路由实例不直出 staticData 属性（见 tags-bar / app-header 的标题兜底）。
 * 键为路由模板路径（动态段为 $xxx），查询用 findRouteStaticMeta。
 */
export function buildRouteStaticMetaMap(router: {
  routesByPath: object;
}): Map<string, RouteStaticMeta> {
  const map = new Map<string, RouteStaticMeta>();

  for (const [path, route] of Object.entries(router.routesByPath)) {
    const staticData = (
      route as {
        options?: { staticData?: { titleKey?: string; icon?: string } };
      }
    ).options?.staticData;

    if (typeof staticData?.titleKey === "string") {
      map.set(path, { titleKey: staticData.titleKey, icon: staticData.icon });
    }
  }

  return map;
}

/** 查询路径的兜底元数据：精确命中，未命中按动态段模板匹配（/org/notices/x → $noticeId）。 */
export function findRouteStaticMeta(
  map: Map<string, RouteStaticMeta>,
  pathname: string,
): RouteStaticMeta | undefined {
  const exact = map.get(pathname);

  if (exact !== undefined) return exact;

  for (const [pattern, meta] of map) {
    if (matchRoutePattern(pattern, pathname)) return meta;
  }

  return undefined;
}
