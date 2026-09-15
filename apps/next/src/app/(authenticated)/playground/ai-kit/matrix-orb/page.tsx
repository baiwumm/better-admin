import { MatrixOrbPage } from "@/features/playground/matrix-orb/matrix-orb-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.matrixOrb");

/** 演示场 › Ai Kit › Matrix Orb（plan-dashboard-playground.md §6）。 */
export default function PlaygroundMatrixOrbRoute() {
  return <MatrixOrbPage />;
}
