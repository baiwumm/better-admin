import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { listUsers } from '../lib/users-service'
import { jsonList, handleRouteError } from '../lib/route-helpers'

/**
 * GET /api/users（SEARCH 位）：分页列表。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const query = getQuery(event)
    const result = await listUsers({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      search: typeof query.search === 'string' ? query.search : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      sort: typeof query.sort === 'string' ? query.sort : undefined,
      order: typeof query.order === 'string' ? query.order : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/users', method: 'GET' })
  }
})
