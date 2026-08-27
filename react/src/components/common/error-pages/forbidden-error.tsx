import { Ban } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";

/** 403 无权限（全屏）。 */
export function ForbiddenErrorPage() {
  const { t } = useTranslation();

  return (
    <ErrorPageShell
      description={t("errors.forbidden.description")}
      icon={<Ban className="size-7" />}
      status="403"
      title={t("errors.forbidden.title")}
    />
  );
}
