import type { MenuNode } from "@/lib/api-types";

import { describe, expect, it } from "vitest";

import {
  canAccessMenu,
  filterAccessibleMenus,
  filterHiddenMenus,
  hasPermission,
  parsePermissionBits,
} from "@/lib/permission";

/**
 * 权限位运算与菜单树过滤测试（与 react / vue 端 permission.ts 同源的纯函数语义）。
 * super_admin 全量位 = 9223372036854775807（后端内部 -1n 的归一化输出，
 * 见 AGENTS.md §19 super_admin 保护设计）。
 */

/** 造一个合法 MenuNode 的最小工厂：只声明本用例关心的字段 */
function makeMenu(partial: Partial<MenuNode> & Pick<MenuNode, "id">): MenuNode {
  return {
    label: partial.id,
    icon: "",
    to: null,
    sort: 0,
    keepAlive: false,
    hideInMenu: false,
    enabled: true,
    defaultOpen: false,
    permissions: "0",
    ...partial,
  };
}

describe("permission", () => {
  describe("parsePermissionBits", () => {
    it("解析字符串位掩码（含超 JS Number 精度的全量位）", () => {
      expect(parsePermissionBits("5")).toBe(5n);
      expect(parsePermissionBits("9223372036854775807")).toBe(
        9223372036854775807n,
      );
    });

    it("number 归一化为 string 再解析", () => {
      expect(parsePermissionBits(5)).toBe(5n);
    });

    it("空值与非法输入返回 null", () => {
      expect(parsePermissionBits(null)).toBeNull();
      expect(parsePermissionBits(undefined)).toBeNull();
      expect(parsePermissionBits("")).toBeNull();
      expect(parsePermissionBits("not-a-number")).toBeNull();
    });
  });

  describe("hasPermission", () => {
    it("拥有任意一个 required bit 即通过（OR 语义）", () => {
      expect(hasPermission("5", 1n)).toBe(true);
      expect(hasPermission("5", 4n)).toBe(true);
      expect(hasPermission("5", 2n)).toBe(false);
      expect(hasPermission("5", 8n)).toBe(false);
    });

    it("识别 super_admin 全量位", () => {
      expect(hasPermission("9223372036854775807", 1n << 40n)).toBe(true);
    });

    it("无权限位（0）不通过，未下发（null）不通过", () => {
      expect(hasPermission("0", 1n)).toBe(false);
      expect(hasPermission(null, 1n)).toBe(false);
    });
  });

  describe("canAccessMenu", () => {
    it("禁用菜单一律不可见", () => {
      expect(
        canAccessMenu(
          makeMenu({ id: "a", enabled: false, userPermissions: "5" }),
        ),
      ).toBe(false);
    });

    it("未下发授权位（null）视为可见（开发期兼容语义）", () => {
      expect(canAccessMenu(makeMenu({ id: "a", userPermissions: null }))).toBe(
        true,
      );
      expect(canAccessMenu(makeMenu({ id: "a" }))).toBe(true);
    });

    it("授权位非 0 可见，0 不可见", () => {
      expect(canAccessMenu(makeMenu({ id: "a", userPermissions: "1" }))).toBe(
        true,
      );
      expect(canAccessMenu(makeMenu({ id: "a", userPermissions: "0" }))).toBe(
        false,
      );
    });
  });

  describe("filterAccessibleMenus", () => {
    it("过滤无权节点；分组下无可见子项时整组隐藏", () => {
      const menus: MenuNode[] = [
        makeMenu({ id: "console", to: "/", userPermissions: "1" }),
        makeMenu({
          id: "settings",
          userPermissions: "1",
          children: [
            makeMenu({
              id: "users",
              to: "/settings/users",
              userPermissions: "0",
            }),
          ],
        }),
        makeMenu({
          id: "org",
          userPermissions: "1",
          children: [
            makeMenu({ id: "depts", to: "/org/depts", userPermissions: "2" }),
          ],
        }),
      ];

      const result = filterAccessibleMenus(menus);

      // settings 唯一子项无权 → 整组消失；org 保留可见子项
      expect(result.map((n) => n.id)).toEqual(["console", "org"]);
      expect(result[1]?.children?.map((n) => n.id)).toEqual(["depts"]);
    });
  });

  describe("filterHiddenMenus", () => {
    it("过滤 hideInMenu 节点；子项全隐藏的分组一并隐藏", () => {
      const menus: MenuNode[] = [
        makeMenu({ id: "a", to: "/a", hideInMenu: true }),
        makeMenu({
          id: "group",
          children: [makeMenu({ id: "b", to: "/b", hideInMenu: true })],
        }),
        makeMenu({ id: "c", to: "/c" }),
      ];

      expect(filterHiddenMenus(menus).map((n) => n.id)).toEqual(["c"]);
    });
  });
});
