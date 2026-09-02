import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createDictType, listDictTypes } from "@/lib/server/dict-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/dict/types（契约）：
 * - GET（SEARCH 位）：全量类型列表（无分页，契约 v1.4）；
 * - POST（ADD 位）：创建类型（code 唯一，创建后不可改）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    return jsonOk(await listDictTypes());
  } catch (error) {
    return handleRouteError(error, { path: "/api/dict/types", method: "GET" });
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
      typeof body?.code !== "string" ||
      body.code.trim().length === 0 ||
      typeof body?.name !== "string" ||
      body.name.trim().length === 0
    ) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "code 与 name 为必填");
    }

    const type = await createDictType(
      {
        code: body.code.trim(),
        name: body.name.trim(),
        description:
          typeof body.description === "string" ? body.description : undefined,
      },
      operator.id,
    );

    return jsonOk(type);
  } catch (error) {
    return handleRouteError(error, { path: "/api/dict/types", method: "POST" });
  }
}
