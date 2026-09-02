import type { NextRequest } from "next/server";
import type { RoleMenuGrant } from "@/lib/api-types";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { getRoleMenus, updateRoleMenus } from "@/lib/server/roles-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * /api/roles/:id/menus（契约）：
 * - GET（SEARCH 位）：该角色当前菜单授权列表；
 * - PUT（GRANT 位，v1.4.4 独立权限不复用 EDIT）：全量替换授权；
 *   super_admin 角色一律 403 SUPER_ADMIN_ROLE_PROTECTED。
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;

    return jsonOk(await getRoleMenus(id));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/roles/:id/menus",
      method: "GET",
    });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.GRANT);

    const { id } = await context.params;

    let body: { roleId?: unknown; menus?: unknown };

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (!Array.isArray(body?.menus)) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "menus 为必填数组");
    }

    const menusPayload: RoleMenuGrant[] = [];

    for (const item of body.menus as unknown[]) {
      const menuId =
        typeof (item as { menuId?: unknown })?.menuId === "string"
          ? (item as { menuId: string }).menuId
          : undefined;
      const permissions =
        typeof (item as { permissions?: unknown })?.permissions === "string"
          ? (item as { permissions: string }).permissions
          : undefined;

      if (!menuId || !permissions) {
        throw new ServerApiError(
          400,
          "VALIDATION_ERROR",
          "menus 项必须包含 menuId 与 permissions",
        );
      }

      menusPayload.push({ menuId, permissions });
    }

    const result = await updateRoleMenus(id, menusPayload, operator.id);

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/roles/:id/menus",
      method: "PUT",
    });
  }
}
