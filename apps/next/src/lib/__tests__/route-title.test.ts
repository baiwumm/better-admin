import { describe, expect, it } from "vitest";

import {
  findRouteStaticMeta,
  getRouteStaticMeta,
  getRouteTitleKey,
  routeStaticMetaByPath,
} from "@/lib/route-title";

/**
 * 路由标题兜底映射测试。
 * 该模块替代 React 版 TanStack Router staticData 机制：新增非菜单路由须在
 * ROUTE_STATIC_META_BY_PATH 登记，动态段经 [param] 模板匹配（语义对齐 React 端）。
 */
describe("route-title", () => {
  describe("精确匹配", () => {
    it("登录白名单页命中标题与图标", () => {
      expect(getRouteTitleKey("/account")).toBe("menu.pageTitle.account");
      expect(getRouteStaticMeta("/account")?.icon).toBe("id-card");
      expect(getRouteTitleKey("/my-notices")).toBe("menu.pageTitle.myNotices");
    });

    it("布局内异常页命中", () => {
      expect(getRouteTitleKey("/exception/403")).toBe("menu.exception.403");
    });
  });

  describe("动态段模板匹配", () => {
    it("公告详情命中 [noticeId] 模板（与列表页同 titleKey）", () => {
      expect(getRouteTitleKey("/org/notices/abc123")).toBe(
        "menu.pageTitle.notices",
      );
    });

    it("段数不同不命中：列表页与多余嵌套均落空", () => {
      expect(findRouteStaticMeta("/org/notices")).toBeUndefined();
      expect(findRouteStaticMeta("/org/notices/abc/extra")).toBeUndefined();
    });

    it("静态段不相等不命中", () => {
      expect(findRouteStaticMeta("/org/users/abc123")).toBeUndefined();
    });
  });

  describe("未登记路径", () => {
    it("返回 undefined（菜单路由标题来自菜单树，不经本映射）", () => {
      expect(getRouteStaticMeta("/settings/users")).toBeUndefined();
      expect(getRouteTitleKey("/")).toBeUndefined();
    });
  });

  describe("routeStaticMetaByPath 兼容形态", () => {
    it("以只读 Map 暴露精确键（对齐 React 版消费形态）", () => {
      expect(routeStaticMetaByPath.get("/account")?.titleKey).toBe(
        "menu.pageTitle.account",
      );
      // Map 只做精确键查询，不含动态模板语义
      expect(routeStaticMetaByPath.get("/org/notices/abc123")).toBeUndefined();
    });
  });
});
