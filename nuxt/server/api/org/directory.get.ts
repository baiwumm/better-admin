import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { listDirectory } from '../../lib/posts-service'
import { jsonList, handleRouteError } from '../../lib/route-helpers'

/** GET /api/org/directory（SEARCH 位）— 人员通讯录（分页；deptId 含下级组织）。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const query = getQuery(event)
    const result = await listDirectory({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      deptId: typeof query.deptId === 'string' ? query.deptId : undefined,
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
      employmentStatus:
        typeof query.employmentStatus === 'string'
          ? query.employmentStatus
          : undefined,
      sort: typeof query.sort === 'string' ? query.sort : undefined,
      order: typeof query.order === 'string' ? query.order : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/directory',
      method: 'GET'
    })
  }
})
