import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { findUser } from '../../lib/users-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** GET /api/users/:id（SEARCH 位）— 用户详情。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')

    return jsonOk(await findUser(id as string))
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/users/:id', method: 'GET' })
  }
})
