import { requireAuthUser } from '../../lib/route-auth'
import { updateAccountEmail } from '../../lib/account-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'
import { EMAIL_PATTERN } from '../../../app/lib/constants'

/** PUT /api/account/email（契约，仅需登录）— 改邮箱（当前密码确认，冲突 409）。 */
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
      typeof body?.email !== 'string'
      || body.email.length === 0
      || typeof body?.currentPassword !== 'string'
      || body.currentPassword.length === 0
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'email 与 currentPassword 为必填'
      )
    }

    // 对齐 nest @IsEmail（契约 AccountEmailUpdateRequest email format）
    if (!EMAIL_PATTERN.test(body.email)) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '邮箱格式不正确')
    }

    const profile = await updateAccountEmail(user.id, {
      email: body.email,
      currentPassword: body.currentPassword
    })

    return jsonOk(profile)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/account/email',
      method: 'PUT'
    })
  }
})
