import { describe, expect, it } from "vitest";

import { isLoginRequiredPath } from "@/lib/route-access";

/**
 * 路由访问控制语义测试（守卫「登录即可访问」白名单的纯函数部分）。
 * 与 vue 端 route-access 同口径；Next 端仅保留登录白名单语义
 * （公共页 / 全屏页判定在 proxy.ts 与布局层，不在本模块）。
 */
describe("route-access", () => {
  describe("isLoginRequiredPath", () => {
    it("白名单路径登录即可访问", () => {
      expect(isLoginRequiredPath("/")).toBe(true);
      expect(isLoginRequiredPath("/account")).toBe(true);
      expect(isLoginRequiredPath("/my-notices")).toBe(true);
    });

    it("公告详情动态前缀豁免菜单权限（站内信消费入口）", () => {
      expect(isLoginRequiredPath("/org/notices/abc123")).toBe(true);
      expect(isLoginRequiredPath("/org/notices/abc123/nested")).toBe(true);
    });

    it("公告列表页不在豁免范围（仍走菜单权限门卫）", () => {
      expect(isLoginRequiredPath("/org/notices")).toBe(false);
    });

    it("精确匹配白名单：尾斜杠与形近前缀不豁免", () => {
      expect(isLoginRequiredPath("/account/")).toBe(false);
      expect(isLoginRequiredPath("/accountx")).toBe(false);
      // 动态前缀带尾斜杠，"/org/noticesabc" 不命中
      expect(isLoginRequiredPath("/org/noticesabc")).toBe(false);
    });

    it("菜单权限管理的页面一律不豁免", () => {
      expect(isLoginRequiredPath("/settings/users")).toBe(false);
      expect(isLoginRequiredPath("/org/depts")).toBe(false);
    });
  });
});
