import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { findPost } from '../../../lib/posts-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** GET /api/org/posts/:id（SEARCH 位）— 详情。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')

    return jsonOk(await findPost(id as string))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/posts/:id',
      method: 'GET'
    })
  }
})
