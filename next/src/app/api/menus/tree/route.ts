import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findManageMenuTree } from "@/lib/server/menus-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * GET /api/menus/tree（契约 GET /menus/tree，SEARCH 位）。
 * 管理用全量菜单树：不做角色可见性过滤（含停用/隐藏节点），
 * 供菜单管理页（N3c）与角色授权抽屉（N3b）使用；支持 search 模糊过滤。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request, Permissions.SEARCH);

    const search = request.nextUrl.searchParams.get("search") ?? undefined;

    return jsonOk(await findManageMenuTree(user, search));
  } catch (error) {
    return handleRouteError(error, { path: "/api/menus/tree", method: "GET" });
  }
}
