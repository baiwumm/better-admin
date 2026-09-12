import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { resetUserPassword } from '../../../lib/users-service'
import { ServerApiError } from '../../../lib/http'
import { assertPasswordFormat } from '../../../lib/password-policy'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/**
 * POST /api/users/:id/reset-password（契约，200，RESET_PASSWORD 位）。
 * 保护校验同删除（不能重置自己的密码）；成功后该用户全端下线。
 * 密码策略（契约 v1.8.0）：格式项在此断言，含目标用户名 / 与其当前密码相同的检查在 service。
 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.RESET_PASSWORD)

    const id = getRouterParam(event, 'id')

    let body: { newPassword?: string }

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (typeof body?.newPassword !== 'string') {
      throw new ServerApiError(400, 'VALIDATION_ERROR', 'newPassword 为必填')
    }
    assertPasswordFormat(body.newPassword)

    await resetUserPassword(id as string, body.newPassword, operator)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/users/:id/reset-password',
      method: 'POST'
    })
  }
})
