import { requireAuthUser } from '../lib/route-auth'
import { listNotifications } from '../lib/notifications-service'
import { jsonList, handleRouteError } from '../lib/route-helpers'

/** GET /api/notifications — 通知列表（铃铛面板；仅登录态，无权限位）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    const query = getQuery(event)
    const result = await listNotifications(user.id, {
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10),
      unreadOnly: query.unreadOnly === 'true'
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notifications',
      method: 'GET'
    })
  }
})
