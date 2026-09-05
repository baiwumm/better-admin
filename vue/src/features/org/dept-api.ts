import type { DeptTreeNode } from "@/lib/api-types";

import { fetchApi } from "@/lib/api-client";

/**
 * 组织管理 API 层（M1 仅暴露用户表单所需的组织树；
 * 组织管理页的 CRUD / 排序 / 错误映射随 M2 组织中心模块补齐）。
 */

/** 组织树查询 key（左树 / 树选择器共用） */
export const DEPTS_TREE_QUERY_KEY = ["org", "depts", "tree"] as const;

/** GET /org/depts/tree — 全量组织树（含停用组织，前端置灰） */
export function fetchDeptTree() {
  return fetchApi<DeptTreeNode[]>("/org/depts/tree");
}
