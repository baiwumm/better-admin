import { CodeBlockPage } from "@/features/playground/code-block/code-block-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.codeBlock");

/** 演示场 › 代码块（plan-dashboard-playground.md §6）。 */
export default function PlaygroundCodeBlockRoute() {
  return <CodeBlockPage />;
}
