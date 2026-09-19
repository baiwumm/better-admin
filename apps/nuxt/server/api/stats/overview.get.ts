import { requireAuthUser } from '../../lib/route-auth'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'
import { fetchStatsOverview } from '../../lib/stats-service'

/**
 * GET /api/stats/overview（契约 GET /stats/overview，200；契约 v1.12.0）。
 * 只读聚合，鉴权为任意已登录用户（与 nest StatsController「无 @Permissions、
 * PermissionsGuard 对无元数据路由放行」口径一致，同 notice 消费接口）；
 * GET 请求不受演示只读模式拦截。
 * 无查询参数：本接口是页面级聚合，7 / 30 日趋势区间由前端本地截取。
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAuthUser(event)

    return jsonOk(await fetchStatsOverview())
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/stats/overview', method: 'GET' })
  }
})
