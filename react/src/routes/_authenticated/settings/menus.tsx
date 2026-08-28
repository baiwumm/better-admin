import { createFileRoute } from "@tanstack/react-router";

import { MenusPage } from "@/features/menus/menus-page";

export const Route = createFileRoute("/_authenticated/settings/menus")({
  staticData: { titleKey: "menu.pageTitle.menus" },
  component: MenusPage,
});
