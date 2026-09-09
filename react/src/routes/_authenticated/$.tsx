import { createFileRoute } from "@tanstack/react-router";

/**
 * catch-all splat 路由：兜住所有未匹配 URL，使请求稳定落在 AdminLayout
 * 内（不触发根路由 notFound 流程、布局不被替换），404 的展示由
 * AdminLayout 主体区 overlay 直显（见 admin-layout.tsx 的 notFound 判定）。
 *
 * 刻意不注册 component：KeepAliveOutlet 按 URL 从 routeTree 解析叶子
 * 组件（findRouteLeafComponent），本路由若带组件会命中 splat 通配、
 * 让任何未知路径都「解析成功」，404 判定随之失效；留空则未知路径解析
 * 结果仍为 undefined，主体区正常显示 404。
 */
export const Route = createFileRoute("/_authenticated/$")({});
