import { createFileRoute } from "@tanstack/react-router";

import { GeneralErrorPage } from "@/components/common/error-pages/general-error";

/** 500 异常页演示（菜单页,主体区 embedded 形态,区别于错误跳转的全屏 /500）。 */
export const Route = createFileRoute("/_authenticated/exception/500")({
  staticData: { titleKey: "menu.exception.500" },
  component: () => <GeneralErrorPage variant="embedded" />,
});
