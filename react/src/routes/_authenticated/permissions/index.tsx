import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/permissions/")({
  component: () => <PlaceholderPage title="权限管理" />,
});
