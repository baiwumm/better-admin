import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { readOneNotification } from "@/lib/server/notifications-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/notifications/:id/read — 单条已读（仅限本人；幂等）。 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request);

    const { id } = await context.params;

    await readOneNotification(user.id, id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notifications/:id/read",
      method: "POST",
    });
  }
}
