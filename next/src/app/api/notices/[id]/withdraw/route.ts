import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { withdrawNotice } from "@/lib/server/notices-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/notices/:id/withdraw（EDIT 位）— 撤回公告（published → withdrawn）。 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthUser(request, Permissions.EDIT);

    const { id } = await context.params;

    return jsonOk(await withdrawNotice(id, user));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notices/:id/withdraw",
      method: "POST",
    });
  }
}
