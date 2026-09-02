import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { remindNotice } from "@/lib/server/notices-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/notices/:id/remind（EDIT 位）— 一键催办（24h 防频）。 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request, Permissions.EDIT);

    const { id } = await context.params;

    return jsonOk(await remindNotice(id, user));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notices/:id/remind",
      method: "POST",
    });
  }
}
