import { createFileRoute } from "@tanstack/react-router";

import { DictsPage } from "@/features/dicts/dicts-page";

export const Route = createFileRoute("/_authenticated/settings/dicts")({
  staticData: { titleKey: "menu.pageTitle.dicts" },
  component: DictsPage,
});
