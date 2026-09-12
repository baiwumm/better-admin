import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { withdrawNotice } from '../../../lib/notices-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** POST /api/notices/:id/withdraw（EDIT 位）— 撤回公告（published → withdrawn）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event, Permissions.EDIT)

    const id = getRouterParam(event, 'id')

    return jsonOk(await withdrawNotice(id as string, user))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notices/:id/withdraw',
      method: 'POST'
    })
  }
})
