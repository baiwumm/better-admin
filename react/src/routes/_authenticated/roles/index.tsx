import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/roles/")({
  component: () => <PlaceholderPage title="角色管理" />,
});
