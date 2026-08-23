import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/settings/appearance")({
  component: () => <PlaceholderPage title="外观" />,
});
