import { createFileRoute } from "@tanstack/react-router";

import { UnauthorizedErrorPage } from "@/components/error-pages/unauthorized-error";

export const Route = createFileRoute("/(errors)/401")({
  component: UnauthorizedErrorPage,
});
