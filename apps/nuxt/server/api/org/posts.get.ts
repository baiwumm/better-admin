import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { listPosts } from '../../lib/posts-service'
import { jsonList, handleRouteError } from '../../lib/route-helpers'

/**
 * GET /api/org/posts（SEARCH 位）：分页列表（deptId 含下级组织 / keyword / category / status 筛选）。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const query = getQuery(event)
    const result = await listPosts({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      deptId: typeof query.deptId === 'string' ? query.deptId : undefined,
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
      category: typeof query.category === 'string' ? query.category : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      sort: typeof query.sort === 'string' ? query.sort : undefined,
      order: typeof query.order === 'string' ? query.order : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/org/posts', method: 'GET' })
  }
})
