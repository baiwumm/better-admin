import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { removeRole } from '../../lib/roles-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** DELETE /api/roles/:id（DELETE 位）— 删除（super_admin 保护；关联用户 409）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removeRole(id as string, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/roles/:id',
      method: 'DELETE'
    })
  }
})
