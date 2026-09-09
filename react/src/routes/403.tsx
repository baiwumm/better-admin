import { createFileRoute } from "@tanstack/react-router";

import { ForbiddenErrorPage } from "@/components/common/error-pages/forbidden-error";

export const Route = createFileRoute("/403")({
  staticData: { titleKey: "errors.forbidden.title" },
  component: ForbiddenErrorPage,
});
