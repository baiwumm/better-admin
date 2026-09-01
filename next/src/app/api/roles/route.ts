import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { listRoles } from "@/lib/server/roles-service";
import { requireAuthUser } from "@/lib/server/route-auth";
import { jsonList, handleRouteError } from "@/lib/server/route-helpers";

/**
 * GET /api/roles（契约 GET /roles，200，SEARCH 位）。
 * N3a 最小实现：分页列表（enabled 筛选 + search），供用户表单角色选项；
 * 完整 CRUD 与授权在 N3b 角色管理期补齐。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { searchParams } = request.nextUrl;
    const result = await listRoles({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      search: searchParams.get("search") ?? undefined,
      enabled: searchParams.get("enabled") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, { path: "/api/roles", method: "GET" });
  }
}
