import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findDept, removeDept, updateDept } from "@/lib/server/depts-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/org/depts/:id（SEARCH 位）— 详情（含 childCount/postCount/userCount）。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;

    return jsonOk(await findDept(id));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/depts/:id",
      method: "GET",
    });
  }
}

/** PUT /api/org/depts/:id（EDIT 位）— 更新（移动防环 + 父级/负责人校验）。 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.EDIT);

    const { id } = await context.params;

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    const dept = await updateDept(
      id,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        code:
          body.code === undefined
            ? undefined
            : typeof body.code === "string" && body.code.length > 0
              ? body.code
              : null,
        parentId:
          body.parentId === undefined
            ? undefined
            : typeof body.parentId === "string" && body.parentId.length > 0
              ? body.parentId
              : null,
        leaderId:
          body.leaderId === undefined
            ? undefined
            : typeof body.leaderId === "string" && body.leaderId.length > 0
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
    return handleRouteError(error, {
      path: "/api/org/depts/:id",
      method: "PUT",
    });
  }
}

/** DELETE /api/org/depts/:id（DELETE 位）— 软删（三级占用校验）。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removeDept(id, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/depts/:id",
      method: "DELETE",
    });
  }
}
