import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { removeDictType } from '../../../lib/dict-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** DELETE /api/dict/types/:code（DELETE 位）— 有字典项 409 DICT_TYPE_IN_USE。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.DELETE)

    const code = getRouterParam(event, 'code')

    await removeDictType(code as string, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/dict/types/:code',
      method: 'DELETE'
    })
  }
})
