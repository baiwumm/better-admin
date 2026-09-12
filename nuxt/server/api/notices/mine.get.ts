import { requireAuthUser } from '../../lib/route-auth'
import { listMyNotices } from '../../lib/notices-service'
import { jsonList, handleRouteError } from '../../lib/route-helpers'

/** GET /api/notices/mine — 我的公告（全员消费端，仅登录态无权限位）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    const query = getQuery(event)
    const result = await listMyNotices(user.id, {
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      keyword: typeof query.keyword === 'string' ? query.keyword : undefined,
      readStatus:
        typeof query.readStatus === 'string' ? query.readStatus : undefined
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notices/mine',
      method: 'GET'
    })
  }
})
