import { getAuthUser } from '../lib/auth/request-auth'
import { findMenuTree } from '../lib/menus-service'
import { jsonOk, jsonError, handleRouteError } from '../lib/route-helpers'

/**
 * GET /api/menus（契约 v1.6.0 /menus，200）。
 * 仅需登录（x-permission: NONE）；返回当前用户可见菜单树 + userPermissions。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthUser(event)

    if (!user) {
      return jsonError(event, 401, 'UNAUTHORIZED', '未登录或 token 无效')
    }

    const tree = await findMenuTree(user)

    return jsonOk(tree)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/menus', method: 'GET' })
  }
})
