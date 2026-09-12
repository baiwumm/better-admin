import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { removeUser } from '../../lib/users-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** DELETE /api/users/:id（DELETE 位）— 软删（保护校验 + 清理关联与会话）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removeUser(id as string, operator)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/users/:id',
      method: 'DELETE'
    })
  }
})
