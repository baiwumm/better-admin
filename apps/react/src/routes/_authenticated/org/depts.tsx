import { createFileRoute } from "@tanstack/react-router";

import { DeptsPage } from "@/features/org/depts-page";

export const Route = createFileRoute("/_authenticated/org/depts")({
  staticData: { titleKey: "menu.pageTitle.depts" },
  component: DeptsPage,
});
