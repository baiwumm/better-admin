import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/menus")({
  staticData: { titleKey: "menu.pageTitle.menus" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
