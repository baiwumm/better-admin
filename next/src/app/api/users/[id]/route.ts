import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findUser, removeUser, updateUser } from "@/lib/server/users-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/users/:id（SEARCH 位）— 用户详情。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;

    return jsonOk(await findUser(id));
  } catch (error) {
    return handleRouteError(error, { path: "/api/users/:id", method: "GET" });
  }
}

/** PUT /api/users/:id（EDIT 位）— 更新（停用走目标保护校验）。 */
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

    const user = await updateUser(
      id,
      {
        email: typeof body.email === "string" ? body.email : undefined,
        displayName:
          typeof body.displayName === "string" ? body.displayName : undefined,
        avatar:
          body.avatar === undefined
            ? undefined
            : typeof body.avatar === "string" || body.avatar === null
              ? (body.avatar as string | null)
              : undefined,
        status:
          body.status === "active" || body.status === "disabled"
            ? body.status
            : undefined,
        roleIds: Array.isArray(body.roleIds)
          ? (body.roleIds as string[])
          : undefined,
      },
      operator,
    );

    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error, { path: "/api/users/:id", method: "PUT" });
  }
}

/** DELETE /api/users/:id（DELETE 位）— 软删（保护校验 + 清理关联与会话）。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removeUser(id, operator);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/users/:id",
      method: "DELETE",
    });
  }
}
