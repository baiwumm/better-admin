import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/")({
  component: () => <PlaceholderPage title="仪表盘" />,
});
