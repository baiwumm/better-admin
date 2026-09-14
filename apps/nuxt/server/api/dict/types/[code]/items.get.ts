import { Permissions } from '../../../../lib/permissions'
import { requireAuthUser } from '../../../../lib/route-auth'
import { listDictItems } from '../../../../lib/dict-service'
import { jsonOk, handleRouteError } from '../../../../lib/route-helpers'

/** GET /api/dict/types/:code/items（SEARCH 位）— 该类型下全量字典项。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const code = getRouterParam(event, 'code')

    return jsonOk(await listDictItems(code as string))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/dict/types/:code/items',
      method: 'GET'
    })
  }
})
