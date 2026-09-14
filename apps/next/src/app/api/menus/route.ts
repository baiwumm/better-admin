import type { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/server/auth/request-auth";
import { createMenu, findMenuTree } from "@/lib/server/menus-service";
import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { ServerApiError } from "@/lib/server/http";
import {
  jsonOk,
  jsonError,
  handleRouteError,
} from "@/lib/server/route-helpers";

/**
 * GET /api/menus（契约 v1.6.0 /menus，200）。
 * 仅需登录（x-permission: NONE）；返回当前用户可见菜单树 + userPermissions。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "未登录或 token 无效");
    }

    const tree = await findMenuTree(user);

    return jsonOk(tree);
  } catch (error) {
    return handleRouteError(error, { path: "/api/menus", method: "GET" });
  }
}

/** POST /api/menus（契约，ADD 位）— 创建顶级/指定父级菜单。 */
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
      typeof body?.label !== "string" ||
      body.label.trim().length === 0 ||
      typeof body?.icon !== "string" ||
      body.icon.trim().length === 0
    ) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "label 与 icon 为必填");
    }

    const node = await createMenu(
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
        parentId:
          typeof body.parentId === "string" && body.parentId.length > 0
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
          typeof body.permissions === "string" ? body.permissions : "0",
      },
      operator.id,
    );

    return jsonOk(node);
  } catch (error) {
    return handleRouteError(error, { path: "/api/menus", method: "POST" });
  }
}
