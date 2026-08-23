import { createFileRoute } from "@tanstack/react-router";

import { GeneralErrorPage } from "@/components/error-pages/general-error";

export const Route = createFileRoute("/500")({
  component: GeneralErrorPage,
});