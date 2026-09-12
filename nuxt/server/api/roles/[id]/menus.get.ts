import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { getRoleMenus } from '../../../lib/roles-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/**
 * GET /api/roles/:id/menus（SEARCH 位）：该角色当前菜单授权列表。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')

    return jsonOk(await getRoleMenus(id as string))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/roles/:id/menus',
      method: 'GET'
    })
  }
})
