import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  staticData: { titleKey: "menu.pageTitle.console" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
