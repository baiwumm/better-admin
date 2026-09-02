import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { countUnreadNotifications } from "@/lib/server/notifications-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/** GET /api/notifications/unread-count — 未读数（红点轮询；仅登录态）。 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    return jsonOk(await countUnreadNotifications(user.id));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notifications/unread-count",
      method: "GET",
    });
  }
}
