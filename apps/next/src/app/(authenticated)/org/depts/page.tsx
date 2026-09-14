import { DeptsPage as OrgDeptsView } from "@/features/org/depts-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.depts");

/** 组织管理页（/org/depts）。左树右表/拖拽排序/负责人选择见 features/org。 */
export default function OrgDeptsPage() {
  return <OrgDeptsView />;
}
