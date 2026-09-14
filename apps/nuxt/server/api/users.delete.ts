import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { batchRemoveUsers } from '../lib/users-service'
import { jsonOk, handleRouteError } from '../lib/route-helpers'

/**
 * DELETE /api/users?ids=（BATCH_DELETE 位）：批量软删（query ids 逗号分隔，全有全无）。
 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.BATCH_DELETE)

    const query = getQuery(event)
    const idsParam = typeof query.ids === 'string' ? query.ids : ''
    const ids = idsParam
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    await batchRemoveUsers(ids, operator)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/users', method: 'DELETE' })
  }
})
