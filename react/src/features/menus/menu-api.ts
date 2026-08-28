import type { MenuNode } from "@/lib/api-types";

import { fetchApi } from "@/lib/api-client";

/** 菜单模块 API 层：管理树拉取 + CRUD（契约 v1.4，无 target 字段）。 */

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
