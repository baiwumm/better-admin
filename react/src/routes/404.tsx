import { createFileRoute } from "@tanstack/react-router";

import { NotFoundErrorPage } from "@/components/common/error-pages/not-found-error";

export const Route = createFileRoute("/404")({
  staticData: { title: "页面不存在" },
  component: NotFoundErrorPage,
});
