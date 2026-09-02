import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createRole, listRoles } from "@/lib/server/roles-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonList, jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/roles 集合路由（契约 GET/POST /roles）：
 * - GET：SEARCH 位，分页列表（search + enabled 筛选）；
 * - POST：ADD 位，创建（code 唯一，创建后不可改）。
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
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, { path: "/api/roles", method: "GET" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const operator = await requireAuthUser(request, Permissions.ADD);

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    // 契约 RoleCreateRequest required [name, code]；enabled 缺省 true
    if (
      typeof body?.name !== "string" ||
      body.name.trim().length === 0 ||
      typeof body?.code !== "string" ||
      body.code.trim().length === 0
    ) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "name 与 code 为必填");
    }

    const role = await createRole(
      {
        name: body.name.trim(),
        code: body.code.trim(),
        description:
          typeof body.description === "string" ? body.description : undefined,
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
        sort: typeof body.sort === "number" ? body.sort : undefined,
      },
      operator.id,
    );

    return jsonOk(role);
  } catch (error) {
    return handleRouteError(error, { path: "/api/roles", method: "POST" });
  }
}
