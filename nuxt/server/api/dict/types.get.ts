import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { listDictTypes } from '../../lib/dict-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * GET /api/dict/types（SEARCH 位）：全量类型列表（无分页，契约 v1.4）。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    return jsonOk(await listDictTypes())
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/dict/types', method: 'GET' })
  }
})
