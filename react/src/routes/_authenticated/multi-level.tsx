import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/multi-level")({
  component: () => <PlaceholderPage title="三级菜单" />,
});
