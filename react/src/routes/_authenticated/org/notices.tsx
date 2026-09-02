import { createFileRoute } from "@tanstack/react-router";

import { NoticesPage } from "@/features/notice/notices-page";

export const Route = createFileRoute("/_authenticated/org/notices")({
  staticData: { titleKey: "menu.pageTitle.notices" },
  component: NoticesPage,
});
