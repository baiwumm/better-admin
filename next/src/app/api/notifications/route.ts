import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { listNotifications } from "@/lib/server/notifications-service";
import { jsonList, handleRouteError } from "@/lib/server/route-helpers";

/** GET /api/notifications — 通知列表（铃铛面板；仅登录态，无权限位）。 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    const { searchParams } = request.nextUrl;
    const result = await listNotifications(user.id, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      unreadOnly: searchParams.get("unreadOnly") === "true",
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notifications",
      method: "GET",
    });
  }
}
