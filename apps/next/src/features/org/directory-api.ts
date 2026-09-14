"use client";

import type { DirectoryEntry } from "@/lib/api-types";
import type { ListQueryParams } from "@/lib/api-types";

import { fetchApiList } from "@/lib/api-client";

/**
 * 人员通讯录 API 层（契约 v1.6.0 阶段 2，GET /org/directory）。
 *
 * - 全员视图实时联查（users × depts × user_posts × posts），无缓存延迟；
 * - deptId 筛选含所选组织的全部下级组织人员；
 * - employmentStatus 缺省 employed（离职人员默认不展示，可显式传 resigned / all）。
 */

/** 通讯录查询参数 */
export interface DirectoryListParams extends ListQueryParams {
  deptId?: string;
  keyword?: string;
  employmentStatus?: "employed" | "resigned" | "all";
  sort?: string;
  order?: "asc" | "desc";
}

/** GET /org/directory — 人员通讯录（分页） */
export function fetchDirectory(params: DirectoryListParams = {}) {
  return fetchApiList<DirectoryEntry>("/org/directory", params);
}
