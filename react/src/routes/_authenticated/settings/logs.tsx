import { createFileRoute } from "@tanstack/react-router";

import { LogsPage } from "@/features/logs/logs-page";

export const Route = createFileRoute("/_authenticated/settings/logs")({
  staticData: { titleKey: "menu.pageTitle.logs" },
  component: LogsPage,
});
