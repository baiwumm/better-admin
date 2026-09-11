import { NoticesPage as OrgNoticesView } from "@/features/notice/notices-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.notices");

/** 公告管理页（/org/notices）。列表/发布/详情抽屉见 features/notice。 */
export default function OrgNoticesPage() {
  return <OrgNoticesView />;
}
