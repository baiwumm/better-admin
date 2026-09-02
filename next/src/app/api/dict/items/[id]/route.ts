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

    const item = await updateDictItem(
      id,
      {
        value: typeof body.value === "string" ? body.value : undefined,
        label: typeof body.label === "string" ? body.label : undefined,
        i18nKey: typeof body.i18nKey === "string" ? body.i18nKey : undefined,
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
