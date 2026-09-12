import { requireAuthUser } from '../../lib/route-auth'
import { findVisibleNotice } from '../../lib/notices-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * GET /api/notices/:id：详情（全员消费接口，仅登录态；可见性校验 + 自动记首读）。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    const id = getRouterParam(event, 'id')

    return jsonOk(await findVisibleNotice(id as string, user))
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/notices/:id', method: 'GET' })
  }
})
