import { TriangleAlert } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";

/**
 * 通用错误兜底（全屏），用作根路由 errorComponent：
 * 页面渲染期间抛出未捕获错误时展示，避免白屏。
 */
export function GeneralErrorPage() {
  const { t } = useTranslation();

  return (
    <ErrorPageShell
      description={t("errors.serverError.description")}
      icon={<TriangleAlert className="size-7" />}
      status="500"
      title={t("errors.serverError.title")}
    />
  );
}
