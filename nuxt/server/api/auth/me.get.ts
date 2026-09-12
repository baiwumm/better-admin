import { getAuthUser } from '../../lib/auth/request-auth'
import {
  jsonOk,
  jsonError,
  handleRouteError
} from '../../lib/route-helpers'

/**
 * GET /api/auth/me（契约 v1.6.0 /auth/me，200）。
 * 对齐 next/src/app/api/auth/me/route.ts。
 * 双源鉴权（Bearer 优先、Cookie 回退）；未认证返回 401 UNAUTHORIZED。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthUser(event)

    if (!user) {
      return jsonError(event, 401, 'UNAUTHORIZED', '未登录或 token 无效')
    }

    return jsonOk(user)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/auth/me',
      method: 'GET'
    })
  }
})
