import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { listNotices } from '../lib/notices-service'
import { jsonList, handleRouteError } from '../lib/route-helpers'

/**
 * GET /api/notices（SEARCH 位）：管理列表（keyword/status 筛选，含已读率）。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const query = getQuery(event)
    const result = await listNotices({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      sort: typeof query.sort === 'string' ? query.sort : undefined,
      order: typeof query.order === 'string' ? query.order : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/notices', method: 'GET' })
  }
})
