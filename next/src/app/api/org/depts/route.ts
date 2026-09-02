import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createDept, listDepts } from "@/lib/server/depts-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonList, jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/org/depts 集合路由（契约）：
 * - GET（SEARCH 位）：分页列表（parentId/status/keyword 筛选）；
 * - POST（ADD 位）：创建（父级/负责人校验；name/code 唯一）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { searchParams } = request.nextUrl;
    const result = await listDepts({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      parentId: searchParams.get("parentId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, { path: "/api/org/depts", method: "GET" });
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

    if (typeof body?.name !== "string" || body.name.trim().length === 0) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "name 为必填");
    }

    const dept = await createDept(
      {
        name: body.name.trim(),
        code:
          typeof body.code === "string" && body.code.length > 0
            ? body.code
            : null,
        parentId:
          typeof body.parentId === "string" && body.parentId.length > 0
            ? body.parentId
            : null,
        leaderId:
          typeof body.leaderId === "string" && body.leaderId.length > 0
            ? body.leaderId
            : null,
        sort: typeof body.sort === "number" ? body.sort : undefined,
        status:
          body.status === "enabled" || body.status === "disabled"
            ? body.status
            : undefined,
      },
      operator.id,
    );

    return jsonOk(dept);
  } catch (error) {
    return handleRouteError(error, { path: "/api/org/depts", method: "POST" });
  }
}
