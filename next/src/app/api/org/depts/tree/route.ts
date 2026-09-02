import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findDeptTree } from "@/lib/server/depts-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/** GET /api/org/depts/tree（SEARCH 位）— 全量组织树（含停用，同级 sort 降序）。 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    return jsonOk(await findDeptTree());
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/depts/tree",
      method: "GET",
    });
  }
}
