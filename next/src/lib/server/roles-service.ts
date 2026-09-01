import "server-only";

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { roles } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";

/**
 * 角色服务（N3a 仅实现列表查询，供用户表单的角色选项拉取；
 * 完整 CRUD 与菜单授权抽屉在 N3b 角色管理期补齐）。
 */

export interface RoleListItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  enabled: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZES = [10, 20, 30, 40, 50];

/** GET /roles — 分页列表（enabled 筛选 + search 匹配 name/code）。 */
export async function listRoles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  enabled?: string;
  sort?: string;
  order?: string;
}): Promise<{
  data: RoleListItem[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10)
    ? (params.pageSize ?? 10)
    : 10;

  // 排序白名单（与 Nest 端对齐的最小子集）
  const sortField =
    params.sort === "name" || params.sort === "code" ? params.sort : "sort";
  const isAsc = params.order !== "desc";

  const conditions = [];

  if (params.enabled === "true" || params.enabled === "false") {
    conditions.push(eq(roles.enabled, params.enabled === "true"));
  }

  const normalizedSearch = params.search?.trim();

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`;

    conditions.push(
      or(ilike(roles.name, pattern), ilike(roles.code, pattern))!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count: total }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(roles)
    .where(where);

  const sortColumn = sortField === "sort" ? roles.sort : roles[sortField];

  const rows = await db
    .select()
    .from(roles)
    .where(where)
    .orderBy(isAsc ? asc(sortColumn) : desc(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (total === undefined) {
    throw new ServerApiError(500, "INTERNAL_ERROR", "服务器内部错误");
  }

  return {
    data: rows,
    pagination: { page, pageSize, total },
  };
}
