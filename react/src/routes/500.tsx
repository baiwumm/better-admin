import { createFileRoute } from "@tanstack/react-router";

import { GeneralErrorPage } from "@/components/common/error-pages/general-error";

export const Route = createFileRoute("/500")({
  staticData: { titleKey: "errors.serverError.title" },
  component: GeneralErrorPage,
});
