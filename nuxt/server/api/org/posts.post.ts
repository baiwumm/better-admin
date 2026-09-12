import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { createPost } from '../../lib/posts-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * POST /api/org/posts（ADD 位）：创建（所属组织校验；同组织名称唯一）。
 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.ADD)

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (
      typeof body?.name !== 'string'
      || body.name.trim().length === 0
      || body.name.trim().length > 100
      || typeof body?.deptId !== 'string'
      || body.deptId.length === 0
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'name/deptId 为必填（name ≤ 100 字符）'
      )
    }
    if (typeof body?.rank === 'string' && body.rank.length > 20) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'rank 不能超过 20 个字符'
      )
    }
    if (
      body?.category !== 'management'
      && body?.category !== 'professional'
      && body?.category !== 'production'
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'category 必须是 management、professional 或 production 之一'
      )
    }
    if (
      body?.status !== undefined
      && body?.status !== 'enabled'
      && body?.status !== 'disabled'
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'status 仅支持 enabled / disabled'
      )
    }

    const post = await createPost(
      {
        name: body.name.trim(),
        deptId: body.deptId,
        category: body.category,
        rank: typeof body.rank === 'string' ? body.rank : undefined,
        status:
          body.status === 'enabled' || body.status === 'disabled'
            ? body.status
            : undefined
      },
      operator.id
    )

    return jsonOk(post)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/org/posts', method: 'POST' })
  }
})
