import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { addChildMenu } from '../../../lib/menus-service'
import { ServerApiError } from '../../../lib/http'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** POST /api/menus/:id/add-child（契约，ADD_CHILD 位）— 新增子菜单。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.ADD_CHILD)

    const id = getRouterParam(event, 'id')

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (
      typeof body?.label !== 'string'
      || body.label.trim().length === 0
      || typeof body?.icon !== 'string'
      || body.icon.trim().length === 0
    ) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', 'label 与 icon 为必填')
    }

    const node = await addChildMenu(
      id as string,
      {
        label: body.label.trim(),
        i18nKey:
          body.i18nKey === undefined
            ? undefined
            : typeof body.i18nKey === 'string' && body.i18nKey.length > 0
              ? body.i18nKey
              : null,
        icon: body.icon.trim(),
        to: typeof body.to === 'string' && body.to.length > 0 ? body.to : null,
        sort: typeof body.sort === 'number' ? body.sort : undefined,
        keepAlive:
          body.keepAlive === undefined ? undefined : Boolean(body.keepAlive),
        hideInMenu:
          body.hideInMenu === undefined ? undefined : Boolean(body.hideInMenu),
        enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
        defaultOpen:
          body.defaultOpen === undefined
            ? undefined
            : Boolean(body.defaultOpen),
        permissions:
          typeof body.permissions === 'string' ? body.permissions : '0'
      },
      operator.id
    )

    return jsonOk(node)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/menus/:id/add-child',
      method: 'POST'
    })
  }
})
