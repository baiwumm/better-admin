import { createFileRoute } from "@tanstack/react-router";

import { PermissionsPage } from "@/features/permissions/permissions-page";

export const Route = createFileRoute("/_authenticated/settings/permissions")({
  staticData: { titleKey: "menu.pageTitle.permissions" },
  component: PermissionsPage,
});
