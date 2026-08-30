import type {
  CreateUserInput,
  ListQueryParams,
  Role,
  UpdateUserInput,
  User,
  UserStatus,
} from "@/lib/api-types";

import { ApiClientError, fetchApi, fetchApiList } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 用户模块 API 层：列表（服务端分页 + 状态筛选）+ CRUD + 状态切换 + 重置密码。
 *
 * - username 创建后锁定（UpdateUserInput 不含 username/password）；
 * - roleIds 为全量替换语义（传空数组表示清空角色，缺省表示不修改）；
 * - 停用/重置密码后端会 bump tokenVersion 并清空 refreshTokens（即刻全端下线）；
 * - 批量删除为单接口事务（含无效 ID 整体 400），批量状态切换无后端批量端点，
 *   由页面用 Promise.allSettled 逐行调用（部分成功语义，见 users-page）。
 */

/** 用户列表查询 key 前缀（分页/搜索/筛选由 useListQuery 拼入 key） */
export const USERS_QUERY_KEY = ["users"] as const;

/** 角色下拉选项查询 key（用户表单用；roles 列表本身分页上限 50，见 fetchRoleOptions） */
export const ROLE_OPTIONS_QUERY_KEY = ["roles", "options"] as const;

/** 用户列表请求参数 */
export interface UserListParams extends ListQueryParams {
  /** 状态筛选（'active'/'disabled'，缺省全部） */
  status?: string;
}

/** GET /users — 用户分页列表 */
export function fetchUsers(params: UserListParams) {
  return fetchApiList<User>("/users", params);
}

/** POST /users — 创建用户 */
export function createUser(input: CreateUserInput) {
  return fetchApi<User>("/users", { method: "POST", body: input });
}

/** PUT /users/:id — 编辑用户（username/password 不可经此接口变更） */
export function updateUser(id: string, input: UpdateUserInput) {
  return fetchApi<User>(`/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /users/:id — 删除用户（软删） */
export function deleteUser(id: string) {
  return fetchApi<null>(`/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** DELETE /users?ids= — 批量删除用户（含无效 ID 时后端整体 400 INVALID_OPERATION） */
export function batchDeleteUsers(ids: string[]) {
  const query = ids.map(encodeURIComponent).join(",");

  return fetchApi<null>(`/users?ids=${query}`, { method: "DELETE" });
}

/** PUT /users/:id/status — 启用/停用用户（停用即刻全端下线） */
export function updateUserStatus(id: string, status: UserStatus) {
  return fetchApi<User>(`/users/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: { status },
  });
}

/** POST /users/:id/reset-password — 重置密码（该用户全部存量会话立即失效） */
export function resetUserPassword(id: string, newPassword: string) {
  return fetchApi<null>(`/users/${encodeURIComponent(id)}/reset-password`, {
    method: "POST",
    body: { newPassword },
  });
}

/**
 * 角色下拉选项：GET /roles 的 pageSize 校验上限为 50（DTO IsIn 白名单），
 * 角色量超过 50 时按页续拉拼全（角色量级小，循环成本可忽略），避免静默丢选项。
 * 仅取启用角色（disabled 角色不可再分配）。
 */
export async function fetchRoleOptions(): Promise<Role[]> {
  const pageSize = 50;
  const first = await fetchApiList<Role>("/roles", {
    page: 1,
    pageSize,
    enabled: "true",
  });
  const roles = [...first.data];
  const totalPages = Math.ceil(first.pagination.total / pageSize);

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchApiList<Role>("/roles", {
      page,
      pageSize,
      enabled: "true",
    });

    roles.push(...next.data);
  }

  return roles;
}

/**
 * 用户模块错误文案映射：后端 message 仅有中文，按 code 走前端 i18n
 * （未知 code 回退后端 message）。
 */
export function getUserErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "USERNAME_EXISTS":
      return getErrorMessage("errors.users.usernameExists", "用户名已被占用");
    case "EMAIL_EXISTS":
      return getErrorMessage("errors.users.emailExists", "邮箱已被占用");
    case "USER_NOT_FOUND":
      return getErrorMessage("errors.users.notFound", "用户不存在或已被删除");
    case "VALIDATION_ERROR":
      return getErrorMessage(
        "errors.users.validation",
        "请求参数不合法，请检查表单后重试",
      );
    case "INVALID_OPERATION":
      return getErrorMessage(
        "errors.users.invalidOperation",
        "所选用户包含无效项，请刷新列表后重试",
      );
    case "SELF_OPERATION_FORBIDDEN":
      return getErrorMessage(
        "errors.users.selfOperationForbidden",
        "不能操作当前登录用户",
      );
    case "ADMIN_USER_PROTECTED":
      return getErrorMessage(
        "errors.users.adminProtected",
        "系统内置管理员账号不可操作",
      );
    case "SUPER_ADMIN_USER_PROTECTED":
      return getErrorMessage(
        "errors.users.superAdminProtected",
        "该用户绑定了超级管理员角色，不可操作",
      );
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
