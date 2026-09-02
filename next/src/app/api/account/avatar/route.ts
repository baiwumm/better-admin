import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import {
  deleteAccountAvatar,
  updateAccountAvatar,
} from "@/lib/server/account-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/account/avatar（契约）：
 * - POST（multipart，字段名 file）：服务端中转上传 Supabase Storage
 *   （webp/png/jpeg、≤2MB），返回 { avatar }（带缓存穿透时间戳）；
 * - DELETE：置空 users.avatar 并尽力清理 Storage 对象，返回最新 Profile。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return handleRouteError(new Error("缺少 file 字段"), {
        path: "/api/account/avatar",
        method: "POST",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await updateAccountAvatar(user.id, {
      buffer,
      mimetype: file.type,
      size: file.size,
    });

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/account/avatar",
      method: "POST",
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    return jsonOk(await deleteAccountAvatar(user.id));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/account/avatar",
      method: "DELETE",
    });
  }
}
