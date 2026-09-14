import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { listLogs } from '../lib/logs-service'
import { jsonList, handleRouteError } from '../lib/route-helpers'

/**
 * GET /api/logs（SEARCH 位）：分页列表（type 精确筛选；search 匹配 action；createdAt 倒序）。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const query = getQuery(event)
    const result = await listLogs({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      search: typeof query.search === 'string' ? query.search : undefined,
      type: typeof query.type === 'string' ? query.type : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/logs', method: 'GET' })
  }
})
