import { createFileRoute } from "@tanstack/react-router";

import { NoticeDetailPage } from "@/features/notice/notice-detail-page";

export const Route = createFileRoute("/_authenticated/org/notices_/$noticeId")({
  staticData: { titleKey: "menu.pageTitle.notices" },
  component: NoticeDetailPage,
});
