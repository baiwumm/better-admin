import { MyNoticesPage as MyNoticesView } from "@/features/notice/my-notices-page";

/** 我的公告页（/my-notices）。全员可见公告列表 + 详情，URL noticeId 驱动选中。 */
export default function MyNoticesRoute() {
  return <MyNoticesView />;
}
