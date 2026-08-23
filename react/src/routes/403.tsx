import { createFileRoute } from "@tanstack/react-router";

import { ForbiddenErrorPage } from "@/components/error-pages/forbidden-error";

export const Route = createFileRoute("/403")({
  component: ForbiddenErrorPage,
});