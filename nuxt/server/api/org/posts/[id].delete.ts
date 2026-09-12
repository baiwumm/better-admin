import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { removePost } from '../../../lib/posts-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** DELETE /api/org/posts/:id（DELETE 位）— 软删（在职人员 409 拦截）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removePost(id as string, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/posts/:id',
      method: 'DELETE'
    })
  }
})
