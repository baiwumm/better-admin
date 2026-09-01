import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import {
  batchRemoveUsers,
  createUser,
  listUsers,
} from "@/lib/server/users-service";
import { jsonList, jsonOk, handleRouteError } from "@/lib/server/route-helpers";
import { ServerApiError } from "@/lib/server/http";

/**
 * /api/users 集合路由（契约 GET/POST /users、DELETE /users?ids=）：
 * - GET：SEARCH 位，分页列表；
 * - POST：ADD 位，创建（成功 200，非 201，与契约一致）；
 * - DELETE：BATCH_DELETE 位，批量软删（query ids 逗号分隔，全有全无）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { searchParams } = request.nextUrl;
    const result = await listUsers({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, { path: "/api/users", method: "GET" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const operator = await requireAuthUser(request, Permissions.ADD);

    const body = (await request.json()) as {
      username?: string;
      email?: string;
      password?: string;
      displayName?: string;
      avatar?: string;
      status?: string;
      roleIds?: string[];
    };

    // 契约 UserCreateRequest required [username, email, password, displayName]
    if (
      typeof body?.username !== "string" ||
      body.username.trim().length === 0 ||
      typeof body?.email !== "string" ||
      body.email.length === 0 ||
      typeof body?.password !== "string" ||
      body.password.length < 6 ||
      typeof body?.displayName !== "string" ||
      body.displayName.trim().length === 0
    ) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求参数无效");
    }

    const user = await createUser(
      {
        username: body.username.trim(),
        email: body.email,
        password: body.password,
        displayName: body.displayName.trim(),
        avatar: body.avatar,
        status: body.status,
        roleIds: Array.isArray(body.roleIds) ? body.roleIds : undefined,
      },
      operator.id,
    );

    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error, { path: "/api/users", method: "POST" });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const operator = await requireAuthUser(request, Permissions.BATCH_DELETE);

    const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await batchRemoveUsers(ids, operator);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, { path: "/api/users", method: "DELETE" });
  }
}
