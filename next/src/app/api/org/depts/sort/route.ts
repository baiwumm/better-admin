import type { NextRequest } from "next/server";
import type { DeptSortItem } from "@/lib/server/depts-service";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { sortDepts } from "@/lib/server/depts-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * PATCH /api/org/depts/sort（EDIT 位）— 拖拽排序（同级调序 / 跨级移动）。
 * body { items: DeptSortItem[] }，事务整批落库 + 批量环检测。
 */
export async function PATCH(request: NextRequest) {
  try {
    const operator = await requireAuthUser(request, Permissions.EDIT);

    let body: { items?: unknown };

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (!Array.isArray(body?.items)) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "items 为必填数组");
    }

    const items: DeptSortItem[] = [];

    for (const item of body.items as unknown[]) {
      const id =
        typeof (item as { id?: unknown })?.id === "string"
          ? (item as { id: string }).id
          : undefined;

      if (!id) {
        throw new ServerApiError(
          400,
          "VALIDATION_ERROR",
          "items 项必须包含 id",
        );
      }

      items.push({
        id,
        parentId:
          typeof (item as { parentId?: unknown })?.parentId === "string"
            ? (item as { parentId: string }).parentId
            : undefined,
        sort:
          typeof (item as { sort?: unknown })?.sort === "number"
            ? (item as { sort: number }).sort
            : undefined,
      });
    }

    await sortDepts(items, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/org/depts/sort",
      method: "PATCH",
    });
  }
}
