import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { findRole } from '../../lib/roles-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** GET /api/roles/:id（SEARCH 位）— 角色详情。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')

    return jsonOk(await findRole(id as string))
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/roles/:id', method: 'GET' })
  }
})
