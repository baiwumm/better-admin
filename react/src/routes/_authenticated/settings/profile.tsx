import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  component: () => <PlaceholderPage title="个人资料" />,
});
