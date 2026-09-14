import { requireAuthUser } from '../../../lib/route-auth'
import { readOneNotification } from '../../../lib/notifications-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** POST /api/notifications/:id/read — 单条已读（仅限本人；幂等）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    const id = getRouterParam(event, 'id')

    await readOneNotification(user.id, id as string)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notifications/:id/read',
      method: 'POST'
    })
  }
})
