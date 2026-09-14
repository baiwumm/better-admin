import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  staticData: { titleKey: "menu.pageTitle.settings" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
