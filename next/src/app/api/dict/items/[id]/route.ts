import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { removeDictItem, updateDictItem } from "@/lib/server/dict-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** PUT /api/dict/items/:id（EDIT 位）— 更新字典项。 */
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

    const value =
      typeof body.value === "string" ? body.value.trim() : undefined;
    const label =
      typeof body.label === "string" ? body.label.trim() : undefined;
    const i18nKey =
      typeof body.i18nKey === "string" ? body.i18nKey.trim() : undefined;

    if (value !== undefined && value.length > 50) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "value 不能超过 50 个字符",
      );
    }
    if (label !== undefined && (label.length < 1 || label.length > 20)) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "label 长度须为 1-20 个字符",
      );
    }
    if (i18nKey !== undefined && i18nKey.length > 0) {
      if (i18nKey.length > 100) {
        throw new ServerApiError(
          400,
          "VALIDATION_ERROR",
          "i18nKey 不能超过 100 个字符",
        );
      }
      if (!/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/.test(i18nKey)) {
        throw new ServerApiError(
          400,
          "VALIDATION_ERROR",
          "i18nKey 须为点分格式，如 dict.user_status.enabled",
        );
      }
    }

    const item = await updateDictItem(
      id,
      {
        value,
        label,
        i18nKey: i18nKey || undefined,
        sort: typeof body.sort === "number" ? body.sort : undefined,
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
      },
      operator.id,
    );

    return jsonOk(item);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/dict/items/:id",
      method: "PUT",
    });
  }
}

/** DELETE /api/dict/items/:id（DELETE 位）— 删除字典项。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removeDictItem(id, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/dict/items/:id",
      method: "DELETE",
    });
  }
}
