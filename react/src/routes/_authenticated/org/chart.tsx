import { createFileRoute } from "@tanstack/react-router";

import { OrgChartPage } from "@/features/org/org-chart-page";

export const Route = createFileRoute("/_authenticated/org/chart")({
  staticData: { titleKey: "menu.pageTitle.chart" },
  component: OrgChartPage,
});
