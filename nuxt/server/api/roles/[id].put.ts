import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { updateRole } from '../../lib/roles-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** PUT /api/roles/:id（EDIT 位）— 更新（code 锁定；super_admin 仅 description 可改）。 */
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

    // 字段长度校验（与前端 zod + NestJS DTO @MaxLength 对齐）
    if (typeof body.name === 'string' && body.name.length > 20) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        '角色名称不能超过 20 个字符'
      )
    }
    if (typeof body.description === 'string' && body.description.length > 200) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        '角色描述不能超过 200 个字符'
      )
    }

    const role = await updateRole(
      id as string,
      {
        name: typeof body.name === 'string' ? body.name : undefined,
        description:
          body.description === undefined
            ? undefined
            : typeof body.description === 'string' || body.description === null
              ? (body.description as string | null)
              : undefined,
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
        sort: typeof body.sort === 'number' ? body.sort : undefined
      },
      operator.id
    )

    return jsonOk(role)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/roles/:id', method: 'PUT' })
  }
})
