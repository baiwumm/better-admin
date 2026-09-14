import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { listNoticeReadStats } from '../../../lib/notices-service'
import { ServerApiError } from '../../../lib/http'
import { jsonList, handleRouteError } from '../../../lib/route-helpers'

/** GET /api/notices/:id/read-stats（SEARCH 位）— 已读/未读名单（分页）。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    // 对齐 nest query dto：status 必填且仅接受 read/unread（非法 400，不静默兜底）
    const status = typeof query.status === 'string' ? query.status : undefined

    if (status !== 'read' && status !== 'unread') {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'status 仅支持 read / unread'
      )
    }

    const result = await listNoticeReadStats(id as string, status, {
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 10)
    })

    return jsonList(result.data, result.pagination)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/notices/:id/read-stats',
      method: 'GET'
    })
  }
})
