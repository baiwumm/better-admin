import { PlaceholderPage } from "@/components/common/placeholder-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.animatedCounter");

/** 演示场 › 数字动画 › Animated Counter（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export default function PlaygroundAnimatedCounterPage() {
  return (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="tally-5"
      titleKey="menu.playground.animatedCounter"
    />
  );
}
