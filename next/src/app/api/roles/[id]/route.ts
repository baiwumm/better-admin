import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findRole, removeRole, updateRole } from "@/lib/server/roles-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/roles/:id（SEARCH 位）— 角色详情。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;

    return jsonOk(await findRole(id));
  } catch (error) {
    return handleRouteError(error, { path: "/api/roles/:id", method: "GET" });
  }
}

/** PUT /api/roles/:id（EDIT 位）— 更新（code 锁定；super_admin 仅 description 可改）。 */
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

    const role = await updateRole(
      id,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        description:
          body.description === undefined
            ? undefined
            : typeof body.description === "string" || body.description === null
              ? (body.description as string | null)
              : undefined,
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
        sort: typeof body.sort === "number" ? body.sort : undefined,
      },
      operator.id,
    );

    return jsonOk(role);
  } catch (error) {
    return handleRouteError(error, { path: "/api/roles/:id", method: "PUT" });
  }
}

/** DELETE /api/roles/:id（DELETE 位）— 删除（super_admin 保护；关联用户 409）。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removeRole(id, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/roles/:id",
      method: "DELETE",
    });
  }
}
