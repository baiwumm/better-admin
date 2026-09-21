import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { listRoleUsers } from "@/lib/server/roles-service";
import { jsonList, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/roles/:id/users（SEARCH 位）— 关联用户名单穿透（契约 v1.13.0，分页）。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;
    const { searchParams } = request.nextUrl;
    const result = await listRoleUsers(id, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/roles/:id/users",
      method: "GET",
    });
  }
}
