import { Permissions } from '../../../../lib/permissions'
import { requireAuthUser } from '../../../../lib/route-auth'
import { createDictItem } from '../../../../lib/dict-service'
import { ServerApiError } from '../../../../lib/http'
import { jsonOk, handleRouteError } from '../../../../lib/route-helpers'
import { I18N_KEY_PATTERN } from '../../../../../app/lib/constants'

/** POST /api/dict/types/:code/items（ADD 位）— 创建字典项（类型下 value 唯一）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.ADD)

    const code = getRouterParam(event, 'code')

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (
      typeof body?.value !== 'string'
      || body.value.trim().length === 0
      || typeof body?.label !== 'string'
      || body.label.trim().length === 0
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'value 与 label 为必填'
      )
    }

    const value = body.value.trim()
    const label = body.label.trim()
    const i18nKey
      = typeof body.i18nKey === 'string' && body.i18nKey.trim().length > 0
        ? body.i18nKey.trim()
        : undefined

    if (value.length > 50) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'value 不能超过 50 个字符'
      )
    }
    if (label.length < 1 || label.length > 20) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'label 长度须为 1-20 个字符'
      )
    }
    if (i18nKey !== undefined) {
      if (i18nKey.length > 100) {
        throw new ServerApiError(
          400,
          'VALIDATION_ERROR',
          'i18nKey 不能超过 100 个字符'
        )
      }
      if (!I18N_KEY_PATTERN.test(i18nKey)) {
        throw new ServerApiError(
          400,
          'VALIDATION_ERROR',
          'i18nKey 须为点分格式，如 dict.user_status.enabled'
        )
      }
    }

    const item = await createDictItem(
      code as string,
      {
        value,
        label,
        i18nKey,
        sort: typeof body.sort === 'number' ? body.sort : undefined,
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled)
      },
      operator.id
    )

    return jsonOk(item)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/dict/types/:code/items',
      method: 'POST'
    })
  }
})
