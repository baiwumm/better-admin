import { NoticeDetailPage as OrgNoticeDetailView } from "@/features/notice/notice-detail-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与列表页 / React 端详情路由
 * staticData 同源；对齐项：此前动态路由未登记，标题回退应用名）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.notices");

/** 公告详情页（/org/notices/[noticeId]）。全员消费端，服务端可见性校验。 */
export default function OrgNoticeDetailPage() {
  return <OrgNoticeDetailView />;
}
