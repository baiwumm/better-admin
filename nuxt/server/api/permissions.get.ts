import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { jsonOk, handleRouteError } from '../lib/route-helpers'

/**
 * GET /api/permissions（契约 GET /permissions，200）。
 * 权限点为编译期常量枚举（非数据库行），仅要求登录。
 * bits 以 number 下发（最大 256，安全整数范围内，与前端 PermissionItem 对齐）。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event)

    const items = Object.values(Permissions).map(p => ({
      value: p.value,
      label: p.label,
      bits: Number(p.bits),
      icon: p.icon
    }))

    return jsonOk(items)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/permissions', method: 'GET' })
  }
})
