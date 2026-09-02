import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { addChildMenu } from "@/lib/server/menus-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/menus/:id/add-child（契约，ADD_CHILD 位）— 新增子菜单。 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.ADD_CHILD);

    const { id } = await context.params;

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (
      typeof body?.label !== "string" ||
      body.label.trim().length === 0 ||
      typeof body?.icon !== "string" ||
      body.icon.trim().length === 0
    ) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "label 与 icon 为必填");
    }

    const node = await addChildMenu(
      id,
      {
        label: body.label.trim(),
        i18nKey:
          body.i18nKey === undefined
            ? undefined
            : typeof body.i18nKey === "string" && body.i18nKey.length > 0
              ? body.i18nKey
              : null,
        icon: body.icon.trim(),
        to: typeof body.to === "string" && body.to.length > 0 ? body.to : null,
        sort: typeof body.sort === "number" ? body.sort : undefined,
        keepAlive:
          body.keepAlive === undefined ? undefined : Boolean(body.keepAlive),
        hideInMenu:
          body.hideInMenu === undefined ? undefined : Boolean(body.hideInMenu),
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
        defaultOpen:
          body.defaultOpen === undefined
            ? undefined
            : Boolean(body.defaultOpen),
        permissions:
          typeof body.permissions === "string" ? body.permissions : "0",
      },
      operator.id,
    );

    return jsonOk(node);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/menus/:id/add-child",
      method: "POST",
    });
  }
}
