import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { updateDictType } from '../../../lib/dict-service'
import { ServerApiError } from '../../../lib/http'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** PUT /api/dict/types/:code（EDIT 位）— 更新（code 不可改；description 传空串清空）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.EDIT)

    const code = getRouterParam(event, 'code')

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const description
      = typeof body.description === 'string'
        ? body.description.trim()
        : undefined

    if (name !== undefined && (name.length < 1 || name.length > 20)) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'name 长度须为 1-20 个字符'
      )
    }
    if (description !== undefined && description.length > 200) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'description 不能超过 200 个字符'
      )
    }

    const type = await updateDictType(
      code as string,
      { name, description },
      operator.id
    )

    return jsonOk(type)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/dict/types/:code',
      method: 'PUT'
    })
  }
})
