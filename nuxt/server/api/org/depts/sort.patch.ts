import type { DeptSortItem } from '../../../lib/depts-service'

import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { sortDepts } from '../../../lib/depts-service'
import { ServerApiError } from '../../../lib/http'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/**
 * PATCH /api/org/depts/sort（EDIT 位）— 拖拽排序（同级调序 / 跨级移动）。
 * body { items: DeptSortItem[] }，事务整批落库 + 批量环检测。
 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.EDIT)

    let body: { items?: unknown }

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    if (!Array.isArray(body?.items)) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', 'items 为必填数组')
    }

    // 对齐 nest @ArrayMaxSize(200)（契约 DeptSortRequest maxItems）
    if (body.items.length > 200) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'items 数量不能超过 200'
      )
    }

    const items: DeptSortItem[] = []

    for (const item of body.items as unknown[]) {
      const id
        = typeof (item as { id?: unknown })?.id === 'string'
          ? (item as { id: string }).id
          : undefined

      if (!id) {
        throw new ServerApiError(
          400,
          'VALIDATION_ERROR',
          'items 项必须包含 id'
        )
      }

      items.push({
        id,
        parentId:
          typeof (item as { parentId?: unknown })?.parentId === 'string'
            ? (item as { parentId: string }).parentId
            : undefined,
        sort:
          typeof (item as { sort?: unknown })?.sort === 'number'
            ? (item as { sort: number }).sort
            : undefined
      })
    }

    await sortDepts(items, operator.id)

    return jsonOk(null)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/depts/sort',
      method: 'PATCH'
    })
  }
})
