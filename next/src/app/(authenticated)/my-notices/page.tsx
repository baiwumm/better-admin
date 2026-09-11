import { MyNoticesPage as MyNoticesView } from "@/features/notice/my-notices-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.myNotices");

/** 我的公告页（/my-notices）。全员可见公告列表 + 详情，URL noticeId 驱动选中。 */
export default function MyNoticesRoute() {
  return <MyNoticesView />;
}
