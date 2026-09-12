import type { H3Event } from 'h3'

import { db } from '../db/client'
import { logs } from '../db/schema'
import { ServerApiError } from './http'
import { generateRecordId } from './ids'

/**
 * Server Route 统一响应与异常处理（h3 版，逐字对齐 next/src/lib/server/
 * route-helpers.ts 的信封与错误语义——等价 Nest 端全局拦截器 + 异常过滤器）：
 * - 成功：{ data } / { data, pagination } 信封（契约 §API 返回结构）；
 * - ServerApiError：透传 status/code/message；
 * - 其余未捕获异常：500 INTERNAL_ERROR（best-effort 写 error 日志，type=error）。
 */

/** 成功响应：{ data } 信封。 */
export function jsonOk<T>(data: T): { data: T } {
  return { data }
}

/** 列表响应：{ data, pagination } 信封。 */
export function jsonList<T>(
  data: T[],
  pagination: { page: number, pageSize: number, total: number }
): { data: T[], pagination: { page: number, pageSize: number, total: number } } {
  return { data, pagination }
}

/** 204 无内容响应（登出等）。 */
export function jsonNoContent(event: H3Event): never {
  setResponseStatus(event, 204)

  return undefined as never
}

/** 错误响应：{ code, message }（契约 §错误响应结构）。 */
export function jsonError(
  event: H3Event,
  status: number,
  code: string,
  message: string
): { code: string, message: string } {
  setResponseStatus(event, status)

  return { code, message }
}

/**
 * 统一异常 → 响应转换（Server Route 的 catch-all 出口）。
 * 未捕获异常 best-effort 写 logs（type=error，与 Nest 端过滤器行为一致）。
 */
export async function handleRouteError(
  event: H3Event,
  error: unknown,
  context?: { path?: string, method?: string, userId?: string | null }
): Promise<{ code: string, message: string }> {
  if (error instanceof ServerApiError) {
    return jsonError(event, error.status, error.code, error.message)
  }

  const message = error instanceof Error ? error.message : String(error)

  // best-effort：写入 error 日志（写入失败不影响响应）
  try {
    await db.insert(logs).values({
      id: generateRecordId(),
      type: 'error',
      action: `error.500`,
      userId: context?.userId ?? null,
      detail: {
        code: 'INTERNAL_ERROR',
        message,
        path: context?.path ?? null,
        method: context?.method ?? null
      }
    })
  } catch {
    /* best-effort，忽略 */
  }

  console.error(`[api] INTERNAL_ERROR:`, error)

  return jsonError(event, 500, 'INTERNAL_ERROR', '服务器内部错误')
}
