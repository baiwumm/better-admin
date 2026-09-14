import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import {
  getAccountProfile,
  updateAccountProfile,
} from "@/lib/server/account-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/account/profile（契约，仅需登录）：
 * - GET：账户详情；
 * - PUT：更新基本信息（displayName/phone/tags/website/githubUsername/xUsername）。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    return jsonOk(await getAccountProfile(user.id));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/account/profile",
      method: "GET",
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const profile = await updateAccountProfile(user.id, {
      displayName:
        typeof body.displayName === "string" ? body.displayName : undefined,
      phone:
        body.phone === undefined
          ? undefined
          : typeof body.phone === "string" && body.phone.length > 0
            ? body.phone
            : null,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
      website:
        body.website === undefined
          ? undefined
          : typeof body.website === "string" && body.website.length > 0
            ? body.website
            : null,
      githubUsername:
        body.githubUsername === undefined
          ? undefined
          : typeof body.githubUsername === "string" &&
              body.githubUsername.length > 0
            ? body.githubUsername
            : null,
      xUsername:
        body.xUsername === undefined
          ? undefined
          : typeof body.xUsername === "string" && body.xUsername.length > 0
            ? body.xUsername
            : null,
    });

    return jsonOk(profile);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/account/profile",
      method: "PUT",
    });
  }
}
