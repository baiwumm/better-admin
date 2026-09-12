import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { updatePost } from '../../../lib/posts-service'
import { ServerApiError } from '../../../lib/http'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** PUT /api/org/posts/:id（EDIT 位）— 更新（deptId 变更时校验所属组织）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.EDIT)

    const id = getRouterParam(event, 'id')

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    // 对齐 nest post-update.dto：传了就必须合法（undefined = 不修改）
    if (typeof body.name === 'string' && body.name.trim().length > 100) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'name 不能超过 100 个字符'
      )
    }
    if (
      body.category !== undefined
      && body.category !== 'management'
      && body.category !== 'professional'
      && body.category !== 'production'
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'category 必须是 management、professional 或 production 之一'
      )
    }
    if (
      body.status !== undefined
      && body.status !== 'enabled'
      && body.status !== 'disabled'
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'status 仅支持 enabled / disabled'
      )
    }
    if (typeof body.rank === 'string' && body.rank.length > 20) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'rank 不能超过 20 个字符'
      )
    }

    const post = await updatePost(
      id as string,
      {
        name: typeof body.name === 'string' ? body.name : undefined,
        deptId: typeof body.deptId === 'string' ? body.deptId : undefined,
        category:
          body.category === 'management'
          || body.category === 'professional'
          || body.category === 'production'
            ? body.category
            : undefined,
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
    return handleRouteError(event, error, {
      path: '/api/org/posts/:id',
      method: 'PUT'
    })
  }
})
