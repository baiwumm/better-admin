import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { removeNotice } from '../../lib/notices-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** DELETE /api/notices/:id（DELETE 位）：删除（软删）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removeNotice(id as string, user)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notices/:id',
      method: 'DELETE'
    })
  }
})
