import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { createNotice } from '../lib/notices-service'
import { ServerApiError } from '../lib/http'
import { jsonOk, handleRouteError } from '../lib/route-helpers'

/**
 * POST /api/notices（ADD 位）：发布公告（未来 publishTime = 定时草稿）。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event, Permissions.ADD)

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (
      typeof body?.title !== 'string'
      || body.title.trim().length === 0
      || typeof body?.content !== 'string'
      || body.content.trim().length === 0
    ) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', 'title/content 为必填')
    }

    const scopeTargets = Array.isArray(body.scopeTargets)
      ? (body.scopeTargets as {
          scopeType: string
          targetId: string
        }[])
      : []

    const notice = await createNotice(
      {
        title: body.title.trim(),
        content: body.content,
        scopeTargets,
        isTop: typeof body.isTop === 'boolean' ? body.isTop : undefined,
        publishTime:
          typeof body.publishTime === 'string' && body.publishTime.length > 0
            ? body.publishTime
            : null
      },
      user
    )

    return jsonOk(notice)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/notices', method: 'POST' })
  }
})
