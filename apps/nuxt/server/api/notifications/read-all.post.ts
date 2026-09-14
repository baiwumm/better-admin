import { requireAuthUser } from '../../lib/route-auth'
import { readAllNotifications } from '../../lib/notifications-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** POST /api/notifications/read-all — 全部已读（仅登录态）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    await readAllNotifications(user.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notifications/read-all',
      method: 'POST'
    })
  }
})
