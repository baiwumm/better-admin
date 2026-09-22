import { OkrTreePage } from "@/features/playground/okr-tree/okr-tree-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.okrTree");

/** 演示场 › 组织架构树（react-okr-tree：组织架构 + OKR 根节点左右双向展开）。 */
export default function PlaygroundOkrTreeRoute() {
  return <OkrTreePage />;
}
