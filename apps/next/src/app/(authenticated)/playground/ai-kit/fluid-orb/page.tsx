import { FluidOrbPage } from "@/features/playground/fluid-orb/fluid-orb-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.fluidOrb");

/** 演示场 › Ai Kit › Fluid Orb（plan-dashboard-playground.md §6）。 */
export default function PlaygroundFluidOrbRoute() {
  return <FluidOrbPage />;
}
