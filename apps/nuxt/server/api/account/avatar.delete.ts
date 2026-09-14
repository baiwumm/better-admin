import { requireAuthUser } from '../../lib/route-auth'
import { deleteAccountAvatar } from '../../lib/account-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * DELETE /api/account/avatar：置空 users.avatar 并尽力清理 Storage 对象，
 * 返回最新 Profile。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    return jsonOk(await deleteAccountAvatar(user.id))
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/account/avatar',
      method: 'DELETE'
    })
  }
})
