import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { findLog } from '../../lib/logs-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** GET /api/logs/:id（SEARCH 位）— 日志详情（联表操作人摘要）。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')

    return jsonOk(await findLog(id as string))
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/logs/:id', method: 'GET' })
  }
})
