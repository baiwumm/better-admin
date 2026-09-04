import { describe, expect, it } from "vitest";

import {
  isLoginRequiredPath,
  isMenuRequiredPath,
  isPublicPath,
} from "@/lib/route-access";

/**
 * 路由访问控制语义测试（守卫三层判定的纯函数部分）。
 * URL 清单与 React 端 src/routes/ 实际路由一一对应。
 */
describe("route-access", () => {
  describe("isPublicPath", () => {
    it("登录页与错误页为公共页", () => {
      expect(isPublicPath("/sign-in")).toBe(true);
      expect(isPublicPath("/403")).toBe(true);
      expect(isPublicPath("/404")).toBe(true);
      expect(isPublicPath("/500")).toBe(true);
    });

    it("认证态页面不是公共页", () => {
      expect(isPublicPath("/")).toBe(false);
      expect(isPublicPath("/account")).toBe(false);
      expect(isPublicPath("/settings/users")).toBe(false);
    });
  });

  describe("isLoginRequiredPath", () => {
    it("白名单路径登录即可访问", () => {
      expect(isLoginRequiredPath("/")).toBe(true);
      expect(isLoginRequiredPath("/account")).toBe(true);
      expect(isLoginRequiredPath("/my-notices")).toBe(true);
    });

    it("公告详情动态前缀豁免菜单权限", () => {
      expect(isLoginRequiredPath("/org/notices/abc123")).toBe(true);
      expect(isLoginRequiredPath("/org/notices/abc123/nested")).toBe(true);
    });

    it("公告列表页不在豁免范围", () => {
      expect(isLoginRequiredPath("/org/notices")).toBe(false);
    });
  });

  describe("isMenuRequiredPath", () => {
    it("系统管理与组织中心管理页走菜单权限", () => {
      expect(isMenuRequiredPath("/settings/users")).toBe(true);
      expect(isMenuRequiredPath("/settings/logs")).toBe(true);
      expect(isMenuRequiredPath("/org/depts")).toBe(true);
      expect(isMenuRequiredPath("/org/notices")).toBe(true);
      expect(isMenuRequiredPath("/org/chart")).toBe(true);
    });

    it("白名单与消费路由不走菜单权限", () => {
      expect(isMenuRequiredPath("/")).toBe(false);
      expect(isMenuRequiredPath("/account")).toBe(false);
      expect(isMenuRequiredPath("/my-notices")).toBe(false);
      expect(isMenuRequiredPath("/org/notices/abc123")).toBe(false);
    });
  });
});
