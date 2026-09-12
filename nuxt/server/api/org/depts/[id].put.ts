import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { updateDept } from '../../../lib/depts-service'
import { ServerApiError } from '../../../lib/http'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** PUT /api/org/depts/:id（EDIT 位）— 更新（移动防环 + 父级/负责人校验）。 */
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

    if (typeof body.name === 'string' && body.name.trim().length > 100) {
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

    const dept = await updateDept(
      id as string,
      {
        name: typeof body.name === 'string' ? body.name : undefined,
        code:
          body.code === undefined
            ? undefined
            : typeof body.code === 'string' && body.code.length > 0
              ? body.code
              : null,
        parentId:
          body.parentId === undefined
            ? undefined
            : typeof body.parentId === 'string' && body.parentId.length > 0
              ? body.parentId
              : null,
        leaderId:
          body.leaderId === undefined
            ? undefined
            : typeof body.leaderId === 'string' && body.leaderId.length > 0
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
    return handleRouteError(event, error, {
      path: '/api/org/depts/:id',
      method: 'PUT'
    })
  }
})
