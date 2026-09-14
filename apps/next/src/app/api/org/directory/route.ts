import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { listDirectory } from "@/lib/server/posts-service";
import { jsonList, handleRouteError } from "@/lib/server/route-helpers";

/** GET /api/org/directory（SEARCH 位）— 人员通讯录（分页；deptId 含下级组织）。 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { searchParams } = request.nextUrl;
    const result = await listDirectory({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      deptId: searchParams.get("deptId") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,
      employmentStatus: searchParams.get("employmentStatus") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/directory",
      method: "GET",
    });
  }
}
