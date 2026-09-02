import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createPost, listPosts } from "@/lib/server/posts-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonList, jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/org/posts 集合路由（契约 v1.6.0）：
 * - GET（SEARCH 位）：分页列表（deptId 含下级组织 / keyword / category / status 筛选）；
 * - POST（ADD 位）：创建（所属组织校验；同组织名称唯一）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { searchParams } = request.nextUrl;
    const result = await listPosts({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      deptId: searchParams.get("deptId") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, { path: "/api/org/posts", method: "GET" });
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

    if (
      typeof body?.name !== "string" ||
      body.name.trim().length === 0 ||
      typeof body?.deptId !== "string" ||
      body.deptId.length === 0
    ) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "name/deptId 为必填");
    }

    const post = await createPost(
      {
        name: body.name.trim(),
        deptId: body.deptId,
        category:
          body.category === "management" ||
          body.category === "professional" ||
          body.category === "production"
            ? body.category
            : "management",
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
    return handleRouteError(error, { path: "/api/org/posts", method: "POST" });
  }
}
