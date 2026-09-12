import { requireAuthUser } from '../../lib/route-auth'
import { getAccountProfile } from '../../lib/account-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** GET /api/account/profile：账户详情。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    return jsonOk(await getAccountProfile(user.id))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/account/profile',
      method: 'GET'
    })
  }
})
