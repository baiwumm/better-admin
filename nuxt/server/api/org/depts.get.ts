import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { listDepts } from '../../lib/depts-service'
import { jsonList, handleRouteError } from '../../lib/route-helpers'

/**
 * GET /api/org/depts（SEARCH 位）：分页列表（parentId/status/keyword 筛选）。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const query = getQuery(event)
    const result = await listDepts({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      parentId: typeof query.parentId === 'string' ? query.parentId : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
      sort: typeof query.sort === 'string' ? query.sort : undefined,
      order: typeof query.order === 'string' ? query.order : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/org/depts', method: 'GET' })
  }
})
