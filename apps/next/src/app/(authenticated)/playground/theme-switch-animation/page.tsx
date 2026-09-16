import { ThemeSwitchAnimationPage } from "@/features/playground/theme-switch-animation/theme-switch-animation-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.themeSwitchAnimation");

/** 演示场 › 主题切换动画（plan-dashboard-playground.md §6）。 */
export default function PlaygroundThemeSwitchAnimationRoute() {
  return <ThemeSwitchAnimationPage />;
}
