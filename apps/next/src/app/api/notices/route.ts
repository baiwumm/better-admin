import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createNotice, listNotices } from "@/lib/server/notices-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonList, jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/notices 集合路由（契约 v1.7.0）：
 * - GET（SEARCH 位）：管理列表（keyword/status 筛选，含已读率）；
 * - POST（ADD 位）：发布公告（未来 publishTime = 定时草稿）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { searchParams } = request.nextUrl;
    const result = await listNotices({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      keyword: searchParams.get("keyword") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, { path: "/api/notices", method: "GET" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request, Permissions.ADD);

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (
      typeof body?.title !== "string" ||
      body.title.trim().length === 0 ||
      typeof body?.content !== "string" ||
      body.content.trim().length === 0
    ) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "title/content 为必填");
    }

    const scopeTargets = Array.isArray(body.scopeTargets)
      ? (body.scopeTargets as {
          scopeType: string;
          targetId: string;
        }[])
      : [];

    const notice = await createNotice(
      {
        title: body.title.trim(),
        content: body.content,
        scopeTargets,
        isTop: typeof body.isTop === "boolean" ? body.isTop : undefined,
        publishTime:
          typeof body.publishTime === "string" && body.publishTime.length > 0
            ? body.publishTime
            : null,
      },
      user,
    );

    return jsonOk(notice);
  } catch (error) {
    return handleRouteError(error, { path: "/api/notices", method: "POST" });
  }
}
