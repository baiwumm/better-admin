import { LoadersPage } from "@/features/playground/loaders/loaders-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.playground.loaders");

/** 演示场 › 加载动画（beUI loader，单组件 17 种加载动效变体）。 */
export default function PlaygroundLoadersRoute() {
  return <LoadersPage />;
}
