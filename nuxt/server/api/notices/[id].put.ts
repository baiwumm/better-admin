import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { updateNotice } from '../../lib/notices-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** PUT /api/notices/:id（EDIT 位）：编辑（draft/published 可编辑）。 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event, Permissions.EDIT)

    const id = getRouterParam(event, 'id')

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    const notice = await updateNotice(
      id as string,
      {
        title: typeof body.title === 'string' ? body.title : undefined,
        content: typeof body.content === 'string' ? body.content : undefined,
        scopeTargets: Array.isArray(body.scopeTargets)
          ? (body.scopeTargets as { scopeType: string, targetId: string }[])
          : undefined,
        isTop: typeof body.isTop === 'boolean' ? body.isTop : undefined,
        publishTime:
          body.publishTime === undefined || body.publishTime === null
            ? null
            : typeof body.publishTime === 'string'
              ? body.publishTime
              : undefined
      },
      user
    )

    return jsonOk(notice)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/notices/:id', method: 'PUT' })
  }
})
