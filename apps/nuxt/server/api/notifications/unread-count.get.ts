import { requireAuthUser } from '../../lib/route-auth'
import { countUnreadNotifications } from '../../lib/notifications-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** GET /api/notifications/unread-count — 未读数（红点轮询；仅登录态）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    return jsonOk(await countUnreadNotifications(user.id))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notifications/unread-count',
      method: 'GET'
    })
  }
})
