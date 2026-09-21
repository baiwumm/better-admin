import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { listRoleUsers } from '../../../lib/roles-service'
import { jsonList, handleRouteError } from '../../../lib/route-helpers'

/** GET /api/roles/:id/users（SEARCH 位）— 关联用户名单穿透（契约 v1.13.0，分页）。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    const result = await listRoleUsers(id as string, {
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10)
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/roles/:id/users',
      method: 'GET'
    })
  }
})
