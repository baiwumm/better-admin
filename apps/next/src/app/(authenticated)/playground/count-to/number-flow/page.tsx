import { NumberFlowPage } from "@/features/playground/number-flow/number-flow-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.numberFlow");

/** 演示场 › 数字动画 › Number Flow（plan-dashboard-playground.md §6）。 */
export default function PlaygroundNumberFlowRoute() {
  return <NumberFlowPage />;
}
