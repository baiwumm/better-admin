import { AnimatedCounterPage } from "@/features/playground/animated-counter/animated-counter-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.animatedCounter");

/** 演示场 › 数字动画 › Animated Counter（plan-dashboard-playground.md §6）。 */
export default function PlaygroundAnimatedCounterRoute() {
  return <AnimatedCounterPage />;
}
