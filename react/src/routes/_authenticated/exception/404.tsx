import { createFileRoute } from "@tanstack/react-router";

import { NotFoundErrorPage } from "@/components/common/error-pages/not-found-error";

/** 404 异常页演示（菜单页,主体区 embedded 形态,区别于错误跳转的全屏 /404）。 */
export const Route = createFileRoute("/_authenticated/exception/404")({
  staticData: { titleKey: "menu.exception.404" },
  component: () => <NotFoundErrorPage variant="embedded" />,
});
