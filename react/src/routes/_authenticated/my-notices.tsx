import { createFileRoute } from "@tanstack/react-router";

import { MyNoticesPage } from "@/features/notice/my-notices-page";

interface MyNoticesSearch {
  noticeId?: string;
}

export const Route = createFileRoute("/_authenticated/my-notices")({
  staticData: { titleKey: "menu.pageTitle.myNotices" },
  validateSearch: (search: Record<string, unknown>): MyNoticesSearch => ({
    noticeId:
      typeof search.noticeId === "string" && search.noticeId
        ? search.noticeId
        : undefined,
  }),
  component: function MyNoticesRoute() {
    const { noticeId } = Route.useSearch();

    return <MyNoticesPage urlNoticeId={noticeId ?? null} />;
  },
});
