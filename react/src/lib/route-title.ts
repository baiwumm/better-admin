/**
 * 路由 staticData.titleKey 工具：为「不在菜单树中的路由」（登录白名单页、
 * 通知详情等动态路由）提供标题兜底来源，与 useDocumentTitle 取词同源
 * （同一套 i18n key）。
 */

import { matchRoutePattern } from "@/lib/route-component";

/**
 * 构建「路由 fullPath → staticData.titleKey」映射。
 * 入参用结构化类型（仅依赖 routesByPath），便于独立单测与复用；
 * routesByPath 声明为 object（生成的 FileRoutesByFullPath 无字符串索引签名，
 * 不能赋给 Record<string, unknown>）。注意：staticData 声明在路由 options 中，
 * 运行时路由实例不直出 staticData 属性（见 tags-bar / app-header 的标题兜底）。
 * 键为路由模板路径（动态段为 $xxx），查询用 findRouteTitleKey。
 */
export function buildRouteTitleKeyMap(router: {
  routesByPath: object;
}): Map<string, string> {
  const map = new Map<string, string>();

  for (const [path, route] of Object.entries(router.routesByPath)) {
    const titleKey = (
      route as { options?: { staticData?: { titleKey?: string } } }
    ).options?.staticData?.titleKey;

    if (typeof titleKey === "string") map.set(path, titleKey);
  }

  return map;
}

/** 查询路径的标题 key：精确命中，未命中按动态段模板匹配（/org/notices/x → $noticeId）。 */
export function findRouteTitleKey(
  map: Map<string, string>,
  pathname: string,
): string | undefined {
  const exact = map.get(pathname);

  if (exact !== undefined) return exact;

  for (const [pattern, titleKey] of map) {
    if (matchRoutePattern(pattern, pathname)) return titleKey;
  }

  return undefined;
}
