import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/permissions")({
  staticData: { titleKey: "menu.pageTitle.permissions" },
  component: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-muted">
      权限管理
    </div>
  ),
});
