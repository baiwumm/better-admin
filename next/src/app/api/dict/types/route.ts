import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createDictType, listDictTypes } from "@/lib/server/dict-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";
import { DICT_TYPE_CODE_PATTERN } from "@/lib/constants";

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

    const code = body.code.trim();
    const name = body.name.trim();
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : undefined;

    if (code.length > 50) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "code 不能超过 50 个字符",
      );
    }
    if (!DICT_TYPE_CODE_PATTERN.test(code)) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "code 必须以字母开头，仅含字母、数字、下划线、中划线",
      );
    }
    if (name.length < 1 || name.length > 20) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "name 长度须为 1-20 个字符",
      );
    }
    if (description !== undefined && description.length > 200) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "description 不能超过 200 个字符",
      );
    }

    const type = await createDictType({ code, name, description }, operator.id);

    return jsonOk(type);
  } catch (error) {
    return handleRouteError(error, { path: "/api/dict/types", method: "POST" });
  }
}
