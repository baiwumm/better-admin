import { requireAuthUser } from '../../lib/route-auth'
import { updateAccountPassword } from '../../lib/account-service'
import { clearAuthCookies } from '../../lib/auth/cookies'
import { ServerApiError } from '../../lib/http'
import { assertPasswordFormat } from '../../lib/password-policy'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * PUT /api/account/password（契约，仅需登录）— 自助改密。
 * 成功即 tokenVersion+1 + 清托管 refreshToken（全端下线）；适配层语义同 Next：
 * 响应顺带清除本端双令牌 Cookie（客户端随即引导重新登录）。
 * 密码策略（契约 v1.8.0）：格式项在此断言，含本人用户名 / 与当前密码相同的检查在 service。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (
      typeof body?.currentPassword !== 'string'
      || body.currentPassword.length === 0
      || typeof body?.newPassword !== 'string'
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'currentPassword 与 newPassword 为必填'
      )
    }
    assertPasswordFormat(body.newPassword)

    await updateAccountPassword(user.id, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword
    })

    clearAuthCookies(event)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/account/password',
      method: 'PUT'
    })
  }
})
