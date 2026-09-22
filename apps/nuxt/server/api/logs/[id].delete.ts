import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { removeLog } from '../../lib/logs-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** DELETE /api/logs/:id（DELETE 位）— 删除单条日志。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removeLog(id as string, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/logs/:id',
      method: 'DELETE'
    })
  }
})
