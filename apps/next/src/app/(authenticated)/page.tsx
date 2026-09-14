import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.console");

/** 控制台首页（React 版同款空壳；完整首页内容后续迭代补充）。 */
export default function ConsolePage() {
  return <div aria-hidden className="h-full min-h-[50vh]" />;
}
