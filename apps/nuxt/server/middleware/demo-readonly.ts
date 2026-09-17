import { demoReadonlyResponse } from '../lib/demo'

/**
 * 演示只读守卫（契约 v1.10.0，server middleware 全局注册）：
 *
 * DEMO_MODE=true 时拦所有非白名单写请求，返回 403 { code: 'DEMO_READONLY' }；
 * 白名单（auth login / refresh / logout / demo-login，notifications read-all
 * / {id}/read）与只读方法放行。DEMO_MODE 关闭时整体放行，行为与现状一致。
 *
 * server middleware 先于全部 Route Handler 执行（等价 Nest 端全局守卫
 * 先于路由级 AuthGuard）：未登录的写请求同样被拦为 DEMO_READONLY 而非 401，
 * 服务端权威、规则只在 lib/demo 一处维护，新增写端点自动被拦。
 * 返回非 undefined 值即短路结束请求（h3 语义，见 demoReadonlyResponse）。
 */
export default defineEventHandler((event) => {
  return demoReadonlyResponse(event)
})
