import type { NextRequest } from "next/server";
import type { DemoLoginKind } from "@/lib/api-types";

import { demoLogin } from "@/lib/server/auth/session";
import { setAuthCookies } from "@/lib/server/auth/cookies";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * POST /api/auth/demo-login（契约 v1.10.0，200）。
 *
 * 业务与 Nest 端一致：DEMO_MODE=true 时按 kind 随机签发演示账号会话
 * （admin = 「系统管理员」演示角色随机一人；random = 其余演示角色两级随机，
 * 超管永不进池）；关闭时 404，本地开发无感。免鉴权、不接触密码，
 * 响应结构复用 /auth/login；差异仅在传输层：双令牌同时写入 httpOnly Cookie。
 */
export async function POST(request: NextRequest) {
  try {
    let body: { kind?: string };

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    // 契约：DemoLoginRequest required [kind]，enum admin | random
    if (body?.kind !== "admin" && body?.kind !== "random") {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "kind 必须为 admin 或 random",
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent");

    const result = await demoLogin(body.kind as DemoLoginKind, {
      ip,
      userAgent,
    });

    const response = jsonOk(result);

    setAuthCookies(response, result);

    return response;
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/auth/demo-login",
      method: "POST",
    });
  }
}
