import { Permissions } from '../../../lib/permissions'
import { requireAuthUser } from '../../../lib/route-auth'
import { findDeptTree } from '../../../lib/depts-service'
import { jsonOk, handleRouteError } from '../../../lib/route-helpers'

/** GET /api/org/depts/tree（SEARCH 位）— 全量组织树（含停用，同级 sort 降序）。 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event, Permissions.SEARCH)

    return jsonOk(await findDeptTree())
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/org/depts/tree',
      method: 'GET'
    })
  }
})
