import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: () => <PlaceholderPage title="系统设置" />,
});
