import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/logs")({
  staticData: { titleKey: "menu.pageTitle.logs" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
