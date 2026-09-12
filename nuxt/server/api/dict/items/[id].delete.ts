import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { removeDictItem } from '../../../lib/dict-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** DELETE /api/dict/items/:id（DELETE 位）— 删除字典项。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const id = getRouterParam(event, 'id')

    await removeDictItem(id as string, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/dict/items/:id',
      method: 'DELETE'
    })
  }
})
