import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findPost, removePost, updatePost } from "@/lib/server/posts-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/org/posts/:id（SEARCH 位）— 详情。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;

    return jsonOk(await findPost(id));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/posts/:id",
      method: "GET",
    });
  }
}

/** PUT /api/org/posts/:id（EDIT 位）— 更新（deptId 变更时校验所属组织）。 */
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

    const post = await updatePost(
      id,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        deptId: typeof body.deptId === "string" ? body.deptId : undefined,
        category:
          body.category === "management" ||
          body.category === "professional" ||
          body.category === "production"
            ? body.category
            : undefined,
        rank: typeof body.rank === "string" ? body.rank : undefined,
        status:
          body.status === "enabled" || body.status === "disabled"
            ? body.status
            : undefined,
      },
      operator.id,
    );

    return jsonOk(post);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/posts/:id",
      method: "PUT",
    });
  }
}

/** DELETE /api/org/posts/:id（DELETE 位）— 软删（在职人员 409 拦截）。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removePost(id, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/posts/:id",
      method: "DELETE",
    });
  }
}
