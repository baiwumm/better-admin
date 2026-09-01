import type { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/server/auth/request-auth";
import { findMenuTree } from "@/lib/server/menus-service";
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
