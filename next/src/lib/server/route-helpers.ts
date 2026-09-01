import "server-only";

import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { logs } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";

/**
 * Route Handler 统一响应与异常处理（等价 Nest 端全局拦截器 + 异常过滤器）：
 * - 成功：{ data } / { data, pagination } 信封（契约 §API 返回结构）；
 * - ServerApiError：透传 status/code/message；
 * - 其余未捕获异常：500 INTERNAL_ERROR（best-effort 写 error 日志，type=error）。
 */

/** 成功响应：{ data } 信封。 */
export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/** 列表响应：{ data, pagination } 信封。 */
export function jsonList<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
): NextResponse {
  return NextResponse.json({ data, pagination });
}

/** 204 无内容响应（登出等）。 */
export function jsonNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** 错误响应：{ code, message }（契约 §错误响应结构）。 */
export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ code, message }, { status });
}

/**
 * 统一异常 → 响应转换（Route Handler 的 catch-all 出口）。
 * 未捕获异常 best-effort 写 logs（type=error，与 Nest 端过滤器行为一致）。
 */
export async function handleRouteError(
  error: unknown,
  context?: { path?: string; method?: string; userId?: string | null },
): Promise<NextResponse> {
  if (error instanceof ServerApiError) {
    return jsonError(error.status, error.code, error.message);
  }

  const message = error instanceof Error ? error.message : String(error);

  // best-effort：写入 error 日志（写入失败不影响响应）
  try {
    await db.insert(logs).values({
      id: generateRecordId(),
      type: "error",
      action: `error.500`,
      userId: context?.userId ?? null,
      detail: {
        code: "INTERNAL_ERROR",
        message,
        path: context?.path ?? null,
        method: context?.method ?? null,
      },
    });
  } catch {
    /* best-effort，忽略 */
  }

  console.error(`[api] INTERNAL_ERROR:`, error);

  return jsonError(500, "INTERNAL_ERROR", "服务器内部错误");
}
