import { createFileRoute } from "@tanstack/react-router";

import { ForbiddenErrorPage } from "@/components/common/error-pages/forbidden-error";

/** 403 异常页演示（菜单页,主体区 embedded 形态,区别于错误跳转的全屏 /403）。 */
export const Route = createFileRoute("/_authenticated/exception/403")({
  staticData: { titleKey: "menu.exception.403" },
  component: () => <ForbiddenErrorPage variant="embedded" />,
});
