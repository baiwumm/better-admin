import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import {
  findDictType,
  removeDictType,
  updateDictType,
} from "@/lib/server/dict-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ code: string }> };

/** GET /api/dict/types/:code（SEARCH 位）— 类型详情。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { code } = await context.params;

    return jsonOk(await findDictType(code));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/dict/types/:code",
      method: "GET",
    });
  }
}

/** PUT /api/dict/types/:code（EDIT 位）— 更新（code 不可改；description 传空串清空）。 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.EDIT);

    const { code } = await context.params;

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    const type = await updateDictType(
      code,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        description:
          typeof body.description === "string" ? body.description : undefined,
      },
      operator.id,
    );

    return jsonOk(type);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/dict/types/:code",
      method: "PUT",
    });
  }
}

/** DELETE /api/dict/types/:code（DELETE 位）— 有字典项 409 DICT_TYPE_IN_USE。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { code } = await context.params;

    await removeDictType(code, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/dict/types/:code",
      method: "DELETE",
    });
  }
}
