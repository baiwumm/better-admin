import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/permissions")({
  staticData: { titleKey: "menu.pageTitle.permissions" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
