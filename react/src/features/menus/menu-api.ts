import type { MenuNode } from "@/lib/api-types";

import { ApiClientError, fetchApi } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/** 菜单模块 API 层：管理树拉取 + CRUD（契约 v1.4，无 target 字段）。 */

/** 菜单错误码 → 本地化文案（未命中回退后端 message） */
export function getMenuErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "MENU_NOT_FOUND":
      return getErrorMessage("errors.menus.menuNotFound", "菜单不存在");
    case "MENU_TO_EXISTS":
      return getErrorMessage("errors.menus.menuToExists", "路由路径已存在");
    case "MENU_TO_INVALID":
      return getErrorMessage(
        "errors.menus.menuToInvalid",
        "路由路径必须以 / 或 https:// 开头",
      );
    case "MENU_HAS_CHILDREN":
      return getErrorMessage(
        "errors.menus.menuHasChildren",
        "该菜单存在子菜单，无法删除",
      );
    case "MENU_PARENT_INVALID":
      return getErrorMessage(
        "errors.menus.menuParentInvalid",
        "父菜单不合法（不存在或移动到自身及下级菜单下）",
      );
    case "INVALID_OPERATION":
      return getErrorMessage(
        "errors.menus.invalidOperation",
        "permissions 不是合法的权限位掩码",
      );
    default:
      return error instanceof Error ? error.message : String(error);
  }
}

/** 管理用全量菜单树查询 key（与导航树 MENUS_QUERY_KEY 分离，便于精准失效） */
export const MENUS_TREE_QUERY_KEY = ["menus", "manageTree"] as const;

/** GET /api/menus/tree — 全量树（含停用/隐藏节点；search 后端模糊过滤） */
export function fetchManageMenuTree(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";

  return fetchApi<MenuNode[]>(`/menus/tree${query}`);
}

/** 菜单创建/更新载荷（UpdateMenuDto 为部分更新语义） */
export interface MenuSaveInput {
  label: string;
  i18nKey?: string | null;
  icon: string;
  to?: string | null;
  parentId?: string | null;
  sort?: number;
  keepAlive?: boolean;
  hideInMenu?: boolean;
  enabled?: boolean;
  defaultOpen?: boolean;
  /** bigint 位掩码字符串（勾选权限位的 OR） */
  permissions?: string;
}

/** POST /api/menus — 创建顶级/指定父级菜单 */
export function createMenu(input: MenuSaveInput) {
  return fetchApi<MenuNode>("/menus", { method: "POST", body: input });
}

/** POST /api/menus/:id/add-child — 新增子菜单（ADD_CHILD 位） */
export function addChildMenu(parentId: string, input: MenuSaveInput) {
  return fetchApi<MenuNode>(`/menus/${parentId}/add-child`, {
    method: "POST",
    body: input,
  });
}

/** PUT /api/menus/:id — 更新（to 传 null 表示清空路由，转为目录节点） */
export function updateMenu(id: string, input: MenuSaveInput) {
  return fetchApi<MenuNode>(`/menus/${id}`, { method: "PUT", body: input });
}

/** DELETE /api/menus/:id — 删除（有子菜单后端 409 拦截） */
export function deleteMenu(id: string) {
  return fetchApi<null>(`/menus/${id}`, { method: "DELETE" });
}
