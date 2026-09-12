import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { createRole } from '../lib/roles-service'
import { ServerApiError } from '../lib/http'
import { jsonOk, handleRouteError } from '../lib/route-helpers'

/**
 * POST /api/roles（ADD 位）：创建（code 唯一，创建后不可改）。
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

    // 契约 RoleCreateRequest required [name, code]；enabled 缺省 true
    if (
      typeof body?.name !== 'string'
      || body.name.trim().length === 0
      || typeof body?.code !== 'string'
      || body.code.trim().length === 0
    ) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', 'name 与 code 为必填')
    }

    // 字段长度校验（与前端 zod + NestJS DTO @MaxLength 对齐）
    if (body.name.trim().length > 20) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        '角色名称不能超过 20 个字符'
      )
    }
    if (body.code.trim().length > 50) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        '角色标识不能超过 50 个字符'
      )
    }
    if (typeof body.description === 'string' && body.description.length > 200) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        '角色描述不能超过 200 个字符'
      )
    }

    const role = await createRole(
      {
        name: body.name.trim(),
        code: body.code.trim(),
        description:
          typeof body.description === 'string' ? body.description : undefined,
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
        sort: typeof body.sort === 'number' ? body.sort : undefined
      },
      operator.id
    )

    return jsonOk(role)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/roles', method: 'POST' })
  }
})
