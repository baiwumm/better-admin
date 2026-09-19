import { generateRouteMetadata } from "@/lib/server/route-metadata";
import { DashboardPage } from "@/features/dashboard/dashboard-page";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.console");

/**
 * 控制台首页（/，Dashboard 概览；React 基准同源移植）。
 * 欢迎横幅 / KPI / 登录趋势 / 角色占比 / 最近动态 / 最新公告见
 * features/dashboard；数据经同源 GET /api/stats/overview（契约 v1.12.0，无取数参数）。
 * 主体区内边距由 AdminShell 的 <main> 提供，此处不再包裹。
 */
export default function ConsolePage() {
  return <DashboardPage />;
}
