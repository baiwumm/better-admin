import { GridRevealPage } from "@/features/playground/grid-reveal/grid-reveal-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.gridReveal");

/** 演示场 › Ai Kit › Grid Reveal（plan-dashboard-playground.md §6）。 */
export default function PlaygroundGridRevealRoute() {
  return <GridRevealPage />;
}
