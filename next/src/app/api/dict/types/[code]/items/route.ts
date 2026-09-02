import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createDictItem, listDictItems } from "@/lib/server/dict-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ code: string }> };

/** GET /api/dict/types/:code/items（SEARCH 位）— 该类型下全量字典项。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { code } = await context.params;

    return jsonOk(await listDictItems(code));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/dict/types/:code/items",
      method: "GET",
    });
  }
}

/** POST /api/dict/types/:code/items（ADD 位）— 创建字典项（类型下 value 唯一）。 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.ADD);

    const { code } = await context.params;

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (
      typeof body?.value !== "string" ||
      body.value.trim().length === 0 ||
      typeof body?.label !== "string" ||
      body.label.trim().length === 0
    ) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "value 与 label 为必填",
      );
    }

    const item = await createDictItem(
      code,
      {
        value: body.value.trim(),
        label: body.label.trim(),
        i18nKey:
          typeof body.i18nKey === "string" && body.i18nKey.length > 0
            ? body.i18nKey
            : undefined,
        sort: typeof body.sort === "number" ? body.sort : undefined,
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
      },
      operator.id,
    );

    return jsonOk(item);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/dict/types/:code/items",
      method: "POST",
    });
  }
}
