import { createFileRoute } from "@tanstack/react-router";

import { ForbiddenErrorPage } from "@/components/error-pages/forbidden-error";

export const Route = createFileRoute("/(errors)/403")({
  component: ForbiddenErrorPage,
});
