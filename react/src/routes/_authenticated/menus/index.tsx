import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/menus/")({
  component: () => <PlaceholderPage title="菜单管理" />,
});
