import { GitHubActivityPage } from "@/features/playground/github-activity/github-activity-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.githubActivity");

/** 演示场 › GitHub Activity（plan-dashboard-playground.md §6）。 */
export default function PlaygroundGitHubActivityRoute() {
  return <GitHubActivityPage />;
}
