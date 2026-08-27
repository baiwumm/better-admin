import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/account")({
  staticData: { titleKey: "menu.pageTitle.account" },
  component: () => <div aria-hidden className="h-full min-h-[50vh]" />,
});
