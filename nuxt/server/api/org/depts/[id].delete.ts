import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { removeDept } from '../../../lib/depts-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** DELETE /api/org/depts/:id（DELETE 位）— 软删（三级占用校验）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removeDept(id as string, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/depts/:id',
      method: 'DELETE'
    })
  }
})
