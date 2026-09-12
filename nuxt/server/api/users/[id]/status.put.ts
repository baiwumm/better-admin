import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { updateUserStatus } from '../../../lib/users-service'
import { ServerApiError } from '../../../lib/http'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/**
 * PUT /api/users/:id/status（契约，200 返回更新后的 User，EDIT 位）。
 * 停用走目标保护校验 + tokenVersion 递增全端下线；启用直接放行。
 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.EDIT)

    const id = getRouterParam(event, 'id')

    let body: { status?: string }

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (body?.status !== 'active' && body?.status !== 'disabled') {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'status 必须为 active 或 disabled'
      )
    }

    const user = await updateUserStatus(id as string, body.status, operator)

    return jsonOk(user)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/users/:id/status',
      method: 'PUT'
    })
  }
})
