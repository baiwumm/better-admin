import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { updateMenu } from '../../lib/menus-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/** PUT /api/menus/:id（EDIT 位）— 更新（to 传 null 转为目录节点）。 */
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

    const node = await updateMenu(
      id as string,
      {
        label: typeof body.label === 'string' ? body.label : undefined,
        i18nKey:
          body.i18nKey === undefined
            ? undefined
            : typeof body.i18nKey === 'string' && body.i18nKey.length > 0
              ? body.i18nKey
              : null,
        icon: typeof body.icon === 'string' ? body.icon : undefined,
        to:
          body.to === undefined
            ? undefined
            : typeof body.to === 'string' && body.to.length > 0
              ? body.to
              : null,
        parentId:
          body.parentId === undefined
            ? undefined
            : typeof body.parentId === 'string' && body.parentId.length > 0
              ? body.parentId
              : null,
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
          typeof body.permissions === 'string' ? body.permissions : undefined
      },
      operator.id
    )

    return jsonOk(node)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/menus/:id', method: 'PUT' })
  }
})
