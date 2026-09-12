import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { removeMenu } from '../../lib/menus-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** DELETE /api/menus/:id（DELETE 位）— 有子菜单 409 MENU_HAS_CHILDREN。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removeMenu(id as string, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/menus/:id',
      method: 'DELETE'
    })
  }
})
