import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/roles")({
  staticData: { titleKey: "menu.pageTitle.roles" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
