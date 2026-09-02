import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findMenu, removeMenu, updateMenu } from "@/lib/server/menus-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/menus/:id（SEARCH 位）— 单菜单详情（含子树与 userPermissions）。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;

    return jsonOk(await findMenu(id, user));
  } catch (error) {
    return handleRouteError(error, { path: "/api/menus/:id", method: "GET" });
  }
}

/** PUT /api/menus/:id（EDIT 位）— 更新（to 传 null 转为目录节点）。 */
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

    const node = await updateMenu(
      id,
      {
        label: typeof body.label === "string" ? body.label : undefined,
        i18nKey:
          body.i18nKey === undefined
            ? undefined
            : typeof body.i18nKey === "string" && body.i18nKey.length > 0
              ? body.i18nKey
              : null,
        icon: typeof body.icon === "string" ? body.icon : undefined,
        to:
          body.to === undefined
            ? undefined
            : typeof body.to === "string" && body.to.length > 0
              ? body.to
              : null,
        parentId:
          body.parentId === undefined
            ? undefined
            : typeof body.parentId === "string" && body.parentId.length > 0
              ? body.parentId
              : null,
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
          typeof body.permissions === "string" ? body.permissions : undefined,
      },
      operator.id,
    );

    return jsonOk(node);
  } catch (error) {
    return handleRouteError(error, { path: "/api/menus/:id", method: "PUT" });
  }
}

/** DELETE /api/menus/:id（DELETE 位）— 有子菜单 409 MENU_HAS_CHILDREN。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removeMenu(id, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/menus/:id",
      method: "DELETE",
    });
  }
}
