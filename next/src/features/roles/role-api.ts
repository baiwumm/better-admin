"use client";

import type {
  ListQueryParams,
  Role,
  RoleMenuGrant,
  RoleMenusPayload,
  SaveRoleInput,
} from "@/lib/api-types";

import { ApiClientError, fetchApi, fetchApiList } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 角色模块 API 层：列表（服务端分页 + 状态筛选）+ CRUD + 菜单授权。
 *
 * - code 创建后锁定（UpdateRoleInput 不含 code，后端忽略）；
 * - 授权为全量替换语义（PUT /roles/:id/menus，permissions=0 的记录也保留）；
 * - 位掩码以字符串传输避免精度丢失（契约约定）。
 */

/** 角色列表查询 key 前缀（分页/搜索/筛选由 useListQuery 拼入 key） */
export const ROLES_QUERY_KEY = ["roles"] as const;

/** 角色菜单授权查询 key */
export const roleMenusQueryKey = (roleId: string) =>
  ["roles", roleId, "menus"] as const;

/** 角色列表请求参数 */
export interface RoleListParams extends ListQueryParams {
  /** 状态筛选（'true'/'false'，缺省全部） */
  enabled?: string;
}

/** GET /roles — 角色分页列表 */
export function fetchRoles(params: RoleListParams) {
  return fetchApiList<Role>(`/roles`, params);
}

/** GET /roles/:id/menus — 角色当前菜单授权（menuId → 位掩码字符串） */
export function fetchRoleMenus(roleId: string) {
  return fetchApi<RoleMenusPayload>(
    `/roles/${encodeURIComponent(roleId)}/menus`,
  );
}

/** PUT /roles/:id/menus — 全量替换角色菜单授权 */
export function updateRoleMenus(roleId: string, menus: RoleMenuGrant[]) {
  return fetchApi<RoleMenusPayload>(
    `/roles/${encodeURIComponent(roleId)}/menus`,
    { method: "PUT", body: { roleId, menus } },
  );
}

/** POST /roles — 创建角色 */
export function createRole(input: SaveRoleInput) {
  return fetchApi<Role>("/roles", { method: "POST", body: input });
}

/** 角色编辑载荷（code 创建后锁定，不可变更） */
export type RoleUpdateInput = Omit<SaveRoleInput, "code">;

/** PUT /roles/:id — 编辑角色（code 不可变更） */
export function updateRole(id: string, input: RoleUpdateInput) {
  return fetchApi<Role>(`/roles/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /roles/:id — 删除角色（已关联用户时后端 409 ROLE_IN_USE 拦截） */
export function deleteRole(id: string) {
  return fetchApi<null>(`/roles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * 角色模块错误文案映射：后端 message 仅有中文，按 code 走前端 i18n
 * （未知 code 回退后端 message）。
 */
export function getRoleErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "ROLE_IN_USE":
      return getErrorMessage(
        "errors.roles.inUse",
        "该角色已关联用户，无法删除",
      );
    case "ROLE_CODE_EXISTS":
      return getErrorMessage("errors.roles.codeExists", "角色 code 已存在");
    case "ROLE_NAME_EXISTS":
      return getErrorMessage("errors.roles.nameExists", "角色名称已存在");
    case "ROLE_NOT_FOUND":
      return getErrorMessage("errors.roles.notFound", "角色不存在");
    case "SUPER_ADMIN_ROLE_PROTECTED":
      return getErrorMessage(
        "errors.roles.superAdminProtected",
        "超级管理员为系统内置角色，不可修改或删除",
      );
    case "INVALID_OPERATION":
      return getErrorMessage(
        "errors.roles.invalidOperation",
        "请求包含非法参数",
      );
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
