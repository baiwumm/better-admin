import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/dicts")({
  staticData: { titleKey: "menu.pageTitle.dicts" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
