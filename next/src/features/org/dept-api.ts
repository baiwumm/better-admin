"use client";

import type {
  Dept,
  DeptCreateInput,
  DeptSortItem,
  DeptTreeNode,
  DeptUpdateInput,
} from "@/lib/api-types";
import type { ListQueryParams } from "@/lib/api-types";

import { ApiClientError, fetchApi, fetchApiList } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 组织管理 API 层（契约 v1.6.0 阶段 1，/org/depts*）。
 *
 * - 树接口（GET /org/depts/tree）为全量数组，含停用组织（前端置灰）；
 * - 组织为软删除：唯一性仅针对未删除记录，名称/编码软删后可复用；
 * - 删除三级校验由后端 409 依序拦截（HAS_CHILDREN / HAS_POSTS / HAS_ACTIVE_USERS）；
 * - 拖拽排序整批提交受影响节点（id + parentId + sort），后端事务内落库。
 */

/** 组织树查询 key（左树 / 树选择器共用） */
export const DEPTS_TREE_QUERY_KEY = ["org", "depts", "tree"] as const;

/** 组织分页列表查询 key（按查询参数隔离） */
export const deptsListQueryKey = (parentId?: string | null, keyword?: string) =>
  ["org", "depts", "list", parentId ?? "root", keyword ?? ""] as const;

/** GET /org/depts/tree — 全量组织树（同级按 sort 降序） */
export function fetchDeptTree() {
  return fetchApi<DeptTreeNode[]>("/org/depts/tree");
}

/** 组织列表查询参数 */
export interface DeptListParams extends ListQueryParams {
  /** 传则返回该组织的直接下级组织 */
  parentId?: string;
  keyword?: string;
  status?: "enabled" | "disabled";
  sort?: string;
  order?: "asc" | "desc";
}

/** GET /org/depts — 组织列表（分页） */
export function fetchDepts(params: DeptListParams = {}) {
  return fetchApiList<Dept>("/org/depts", params);
}

/** POST /org/depts — 新增组织 */
export function createDept(input: DeptCreateInput) {
  return fetchApi<Dept>("/org/depts", { method: "POST", body: input });
}

/** PUT /org/depts/:id — 编辑组织（parentId null = 移为顶级） */
export function updateDept(id: string, input: DeptUpdateInput) {
  return fetchApi<Dept>(`/org/depts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /org/depts/:id — 删除组织（三级校验 409 拦截） */
export function deleteDept(id: string) {
  return fetchApi<null>(`/org/depts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** PATCH /org/depts/sort — 拖拽排序（整批提交，任一 ID 无效整体失败） */
export function sortDepts(items: DeptSortItem[]) {
  return fetchApi<null>("/org/depts/sort", {
    method: "PATCH",
    body: { items },
  });
}

/**
 * 组织模块错误文案映射：后端 message 仅有中文，按 code 走前端 i18n
 * （与错误码一一对应；未知 code 回退后端 message）。
 */
export function getDeptErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "DEPT_NOT_FOUND":
      return getErrorMessage("errors.depts.notFound", "组织不存在");
    case "DEPT_NAME_EXISTS":
      return getErrorMessage("errors.depts.nameExists", "组织名称已存在");
    case "DEPT_CODE_EXISTS":
      return getErrorMessage("errors.depts.codeExists", "组织编码已存在");
    case "DEPT_PARENT_INVALID":
      return getErrorMessage(
        "errors.depts.parentInvalid",
        "上级组织不合法（不存在、已停用或移动到自身及下级组织下）",
      );
    case "DEPT_HAS_CHILDREN":
      return getErrorMessage(
        "errors.depts.hasChildren",
        "该组织下存在下级组织，请先删除下级组织",
      );
    case "DEPT_HAS_POSTS":
      return getErrorMessage(
        "errors.depts.hasPosts",
        "该组织下存在岗位，请先移除该组织下的岗位",
      );
    case "DEPT_HAS_ACTIVE_USERS":
      return getErrorMessage(
        "errors.depts.hasActiveUsers",
        "该组织下存在在职人员，请先调岗或离职处理",
      );
    case "INVALID_OPERATION":
      return getErrorMessage(
        "errors.depts.invalidOperation",
        "部分组织 ID 无效",
      );
    case "USER_NOT_FOUND":
      return getErrorMessage("errors.depts.leaderNotFound", "负责人不存在");
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
