import type { DemoLoginKind } from '../../../app/lib/api-types'

import { demoLogin } from '../../lib/auth/session'
import { setAuthCookies } from '../../lib/auth/cookies'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * POST /api/auth/demo-login（契约 v1.10.0，200）。对齐
 * next/src/app/api/auth/demo-login/route.ts。
 *
 * 业务与 Nest 端一致：DEMO_MODE=true 时按 kind 随机签发演示账号会话
 * （admin = 「系统管理员」演示角色随机一人；random = 其余演示角色两级随机，
 * 超管永不进池）；关闭时 404，本地开发无感。免鉴权、不接触密码，
 * 响应结构复用 /auth/login；差异仅在传输层：双令牌同时写入 httpOnly Cookie。
 */
export default defineEventHandler(async (event) => {
  try {
    let body: { kind?: string }

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    // 契约：DemoLoginRequest required [kind]，enum admin | random
    if (body?.kind !== 'admin' && body?.kind !== 'random') {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'kind 必须为 admin 或 random'
      )
    }

    const ip
      = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
        || getRequestHeader(event, 'x-real-ip')
        || null
    const userAgent = getRequestHeader(event, 'user-agent')

    const result = await demoLogin(body.kind as DemoLoginKind, {
      ip,
      userAgent
    })

    setAuthCookies(event, result)

    return jsonOk(result)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/auth/demo-login',
      method: 'POST'
    })
  }
})
