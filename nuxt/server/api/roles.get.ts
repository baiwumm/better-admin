import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { listRoles } from '../lib/roles-service'
import { jsonList, handleRouteError } from '../lib/route-helpers'

/**
 * GET /api/roles（SEARCH 位）：分页列表（search + enabled 筛选）。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const query = getQuery(event)
    const result = await listRoles({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      search: typeof query.search === 'string' ? query.search : undefined,
      enabled: typeof query.enabled === 'string' ? query.enabled : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/roles', method: 'GET' })
  }
})
