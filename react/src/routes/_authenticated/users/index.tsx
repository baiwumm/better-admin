import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/pages/placeholder-page";

export const Route = createFileRoute("/_authenticated/users/")({
  component: () => <PlaceholderPage title="用户管理" />,
});
