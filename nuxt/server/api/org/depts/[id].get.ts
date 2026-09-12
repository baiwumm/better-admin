import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { findDept } from '../../../lib/depts-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** GET /api/org/depts/:id（SEARCH 位）— 详情（含 childCount/postCount/userCount）。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')

    return jsonOk(await findDept(id as string))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/depts/:id',
      method: 'GET'
    })
  }
})
