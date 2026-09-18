import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage } from "@/features/dashboard/dashboard-page";

export const Route = createFileRoute("/_authenticated/")({
  staticData: { titleKey: "menu.pageTitle.console" },
  component: DashboardPage,
});
