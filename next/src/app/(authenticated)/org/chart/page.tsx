import { OrgChartPage as OrgChartView } from "@/features/org/org-chart-page";

/** 组织架构图谱页（/org/chart）。只读可视化：平移/缩放/Fit View/折叠展开，节点点击跳通讯录。 */
export default function OrgChartRoute() {
  return <OrgChartView />;
}
