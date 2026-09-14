import { OrgChartPage as OrgChartView } from "@/features/org/org-chart-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.chart");

/** 组织架构图谱页（/org/chart）。只读可视化：平移/缩放/Fit View/折叠展开，节点点击跳通讯录。 */
export default function OrgChartRoute() {
  return <OrgChartView />;
}
