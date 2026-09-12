import { Permissions } from '../../../../lib/permissions'
import { requireAuthUser } from '../../../../lib/route-auth'
import { listPostMembers } from '../../../../lib/posts-service'
import { jsonList, handleRouteError } from '../../../../lib/route-helpers'

/** GET /api/org/posts/:id/members（SEARCH 位）— 在职人数穿透（分页）。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    const result = await listPostMembers(id as string, {
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10)
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/posts/:id/members',
      method: 'GET'
    })
  }
})
