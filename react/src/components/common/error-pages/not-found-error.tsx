import { FileQuestion } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";

/** 404 页面不存在：Admin 布局内由主体区 overlay 直显，布局外作根路由 notFoundComponent。 */
export function NotFoundErrorPage() {
  const { t } = useTranslation();

  return (
    <ErrorPageShell
      description={t("errors.notFound.description")}
      icon={<FileQuestion className="size-7" />}
      status="404"
      title={t("errors.notFound.title")}
      tone="primary"
    />
  );
}
