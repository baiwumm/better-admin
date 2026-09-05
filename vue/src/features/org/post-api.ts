import type { DeptStatus, Post, PostCategory } from "@/lib/api-types";
import type { ListQueryParams } from "@/lib/api-types";

import { fetchApiList } from "@/lib/api-client";

/**
 * 岗位管理 API 层（M1 仅暴露用户表单所需的岗位列表；
 * 岗位管理页 CRUD / 成员穿透随 M2 组织中心模块补齐）。
 */

/** 岗位列表查询参数 */
export interface PostListParams extends ListQueryParams {
  deptId?: string;
  keyword?: string;
  category?: PostCategory;
  status?: DeptStatus;
  sort?: string;
  order?: "asc" | "desc";
}

/** GET /org/posts — 岗位列表（分页） */
export function fetchPosts(params: PostListParams = {}) {
  return fetchApiList<Post>("/org/posts", params);
}
