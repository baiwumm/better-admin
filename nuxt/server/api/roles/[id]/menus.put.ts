import type { RoleMenuGrant } from '../../../../app/lib/api-types'

import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { updateRoleMenus } from '../../../lib/roles-service'
import { ServerApiError } from '../../../lib/http'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/**
 * PUT /api/roles/:id/menus（GRANT 位，v1.4.4 独立权限不复用 EDIT）：全量替换授权；
 * super_admin 角色一律 403 SUPER_ADMIN_ROLE_PROTECTED。
 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.GRANT)

    const id = getRouterParam(event, 'id')

    let body: { roleId?: unknown, menus?: unknown }

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (!Array.isArray(body?.menus)) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', 'menus 为必填数组')
    }

    const menusPayload: RoleMenuGrant[] = []

    for (const item of body.menus as unknown[]) {
      const menuId
        = typeof (item as { menuId?: unknown })?.menuId === 'string'
          ? (item as { menuId: string }).menuId
          : undefined
      const permissions
        = typeof (item as { permissions?: unknown })?.permissions === 'string'
          ? (item as { permissions: string }).permissions
          : undefined

      if (!menuId || !permissions) {
        throw new ServerApiError(
          400,
          'VALIDATION_ERROR',
          'menus 项必须包含 menuId 与 permissions'
        )
      }

      menusPayload.push({ menuId, permissions })
    }

    const result = await updateRoleMenus(id as string, menusPayload, operator.id)

    return jsonOk(result)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/roles/:id/menus',
      method: 'PUT'
    })
  }
})
