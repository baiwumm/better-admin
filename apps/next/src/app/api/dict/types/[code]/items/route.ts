import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { createDictItem, listDictItems } from "@/lib/server/dict-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";
import { I18N_KEY_PATTERN } from "@/lib/constants";

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

    const value = body.value.trim();
    const label = body.label.trim();
    const i18nKey =
      typeof body.i18nKey === "string" && body.i18nKey.trim().length > 0
        ? body.i18nKey.trim()
        : undefined;

    if (value.length > 50) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "value 不能超过 50 个字符",
      );
    }
    if (label.length < 1 || label.length > 20) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "label 长度须为 1-20 个字符",
      );
    }
    if (i18nKey !== undefined) {
      if (i18nKey.length > 100) {
        throw new ServerApiError(
          400,
          "VALIDATION_ERROR",
          "i18nKey 不能超过 100 个字符",
        );
      }
      if (!I18N_KEY_PATTERN.test(i18nKey)) {
        throw new ServerApiError(
          400,
          "VALIDATION_ERROR",
          "i18nKey 须为点分格式，如 dict.user_status.enabled",
        );
      }
    }

    const item = await createDictItem(
      code,
      {
        value,
        label,
        i18nKey,
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
