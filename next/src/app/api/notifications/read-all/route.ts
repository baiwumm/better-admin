import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { readAllNotifications } from "@/lib/server/notifications-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/** POST /api/notifications/read-all — 全部已读（仅登录态）。 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    await readAllNotifications(user.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notifications/read-all",
      method: "POST",
    });
  }
}
