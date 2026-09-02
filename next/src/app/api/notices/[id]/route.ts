import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import {
  findVisibleNotice,
  removeNotice,
  updateNotice,
} from "@/lib/server/notices-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * /api/notices/:id 路由（契约 v1.7.0）：
 * - GET：详情（全员消费接口，仅登录态；可见性校验 + 自动记首读）；
 * - PUT（EDIT 位）：编辑（draft/published 可编辑）；
 * - DELETE（DELETE 位）：删除（软删）。
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request);

    const { id } = await context.params;

    return jsonOk(await findVisibleNotice(id, user));
  } catch (error) {
    return handleRouteError(error, { path: "/api/notices/:id", method: "GET" });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request, Permissions.EDIT);

    const { id } = await context.params;

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    const notice = await updateNotice(
      id,
      {
        title: typeof body.title === "string" ? body.title : undefined,
        content: typeof body.content === "string" ? body.content : undefined,
        scopeTargets: Array.isArray(body.scopeTargets)
          ? (body.scopeTargets as { scopeType: string; targetId: string }[])
          : undefined,
        isTop: typeof body.isTop === "boolean" ? body.isTop : undefined,
        publishTime:
          body.publishTime === undefined || body.publishTime === null
            ? null
            : typeof body.publishTime === "string"
              ? body.publishTime
              : undefined,
      },
      user,
    );

    return jsonOk(notice);
  } catch (error) {
    return handleRouteError(error, { path: "/api/notices/:id", method: "PUT" });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removeNotice(id, user);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notices/:id",
      method: "DELETE",
    });
  }
}
