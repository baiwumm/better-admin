import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { findDictType } from '../../../lib/dict-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** GET /api/dict/types/:code（SEARCH 位）— 类型详情。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const code = getRouterParam(event, 'code')

    return jsonOk(await findDictType(code as string))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/dict/types/:code',
      method: 'GET'
    })
  }
})
