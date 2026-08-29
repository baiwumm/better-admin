import { createFileRoute } from "@tanstack/react-router";

import { RolesPage } from "@/features/roles/roles-page";

export const Route = createFileRoute("/_authenticated/settings/roles")({
  staticData: { titleKey: "menu.pageTitle.roles" },
  component: RolesPage,
});
