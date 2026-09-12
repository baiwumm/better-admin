import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { remindNotice } from '../../../lib/notices-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** POST /api/notices/:id/remind（EDIT 位）— 一键催办（24h 防频）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event, Permissions.EDIT)

    const id = getRouterParam(event, 'id')

    return jsonOk(await remindNotice(id as string, user))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notices/:id/remind',
      method: 'POST'
    })
  }
})
