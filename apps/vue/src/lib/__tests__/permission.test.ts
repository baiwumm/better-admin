import type { MenuNode } from "@/lib/api-types";

import { describe, expect, it } from "vitest";

import {
  filterHiddenMenus,
  findMenuPath,
  hasPermission,
  parsePermissionBits,
} from "@/lib/permission";

/**
 * 权限位运算与菜单树过滤测试（与 React 端 permission.ts 同源的纯函数语义）。
 * super_admin 全量位 = 9223372036854775807（后端内部 -1n 的归一化输出）。
 */
describe("permission", () => {
  describe("parsePermissionBits", () => {
    it("解析字符串位掩码", () => {
      expect(parsePermissionBits("9223372036854775807")).toBe(
        9223372036854775807n,
      );
      expect(parsePermissionBits("5")).toBe(5n);
    });

    it("解析数字位掩码（归一化为 string 避免 BigInt 精度丢失）", () => {
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

  describe("findMenuPath", () => {
    const menus: MenuNode[] = [
      {
        id: "console",
        label: "控制台",
        icon: "layout-dashboard",
        to: "/",
        sort: 0,
        keepAlive: false,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        permissions: "9223372036854775807",
      },
      {
        id: "settings",
        label: "系统管理",
        icon: "settings",
        to: null,
        sort: 1,
        keepAlive: false,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        permissions: "0",
        children: [
          {
            id: "users",
            label: "用户管理",
            icon: "users",
            to: "/settings/users",
            parentId: "settings",
            sort: 0,
            keepAlive: true,
            hideInMenu: false,
            enabled: true,
            defaultOpen: false,
            permissions: "1",
          },
        ],
      },
    ];

    it("命中叶子路径（含嵌套）", () => {
      expect(findMenuPath(menus, "/")).toBe(true);
      expect(findMenuPath(menus, "/settings/users")).toBe(true);
    });

    it("未授权路径不命中", () => {
      expect(findMenuPath(menus, "/settings/roles")).toBe(false);
    });
  });

  describe("filterHiddenMenus", () => {
    it("过滤 hideInMenu 节点", () => {
      const menus: MenuNode[] = [
        {
          id: "a",
          label: "A",
          icon: "",
          to: "/a",
          sort: 0,
          keepAlive: false,
          hideInMenu: true,
          enabled: true,
          defaultOpen: false,
          permissions: "1",
        },
        {
          id: "b",
          label: "B",
          icon: "",
          to: "/b",
          sort: 1,
          keepAlive: false,
          hideInMenu: false,
          enabled: true,
          defaultOpen: false,
          permissions: "1",
        },
      ];

      expect(filterHiddenMenus(menus)).toHaveLength(1);
      expect(filterHiddenMenus(menus)[0]?.id).toBe("b");
    });
  });
});
