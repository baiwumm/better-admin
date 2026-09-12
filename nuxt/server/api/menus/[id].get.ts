import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { findMenu } from '../../lib/menus-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** GET /api/menus/:id（SEARCH 位）— 单菜单详情（含子树与 userPermissions）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')

    return jsonOk(await findMenu(id as string, user))
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/menus/:id', method: 'GET' })
  }
})
