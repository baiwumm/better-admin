import { PlaceholderPage } from "@/components/common/placeholder-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.githubActivity");

/** 演示场 › GitHub Activity（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export default function PlaygroundGithubActivityPage() {
  return (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="calendar-days"
      titleKey="menu.playground.githubActivity"
    />
  );
}
