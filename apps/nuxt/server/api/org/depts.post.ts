import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { createDept } from '../../lib/depts-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * POST /api/org/depts（ADD 位）：创建（父级/负责人校验；name/code 唯一）。
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

    if (typeof body?.name !== 'string' || body.name.trim().length === 0) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', 'name 为必填')
    }
    if (body.name.trim().length > 100) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'name 不能超过 100 个字符'
      )
    }
    if (typeof body.code === 'string' && body.code.length > 50) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'code 不能超过 50 个字符'
      )
    }

    const dept = await createDept(
      {
        name: body.name.trim(),
        code:
          typeof body.code === 'string' && body.code.length > 0
            ? body.code
            : null,
        parentId:
          typeof body.parentId === 'string' && body.parentId.length > 0
            ? body.parentId
            : null,
        leaderId:
          typeof body.leaderId === 'string' && body.leaderId.length > 0
            ? body.leaderId
            : null,
        sort: typeof body.sort === 'number' ? body.sort : undefined,
        status:
          body.status === 'enabled' || body.status === 'disabled'
            ? body.status
            : undefined
      },
      operator.id
    )

    return jsonOk(dept)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/org/depts', method: 'POST' })
  }
})
