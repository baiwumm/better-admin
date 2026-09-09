"use client";

import { IllustrationForbidden } from "./illustration-forbidden";
import { ResultPage } from "./result-page";

import { useTranslation } from "@/i18n";

/** 403 无权限页（/403 路由），操作区用 ResultPage 默认双按钮。 */
export function ForbiddenErrorPage() {
  const { t } = useTranslation();

  return (
    <ResultPage
      image={<IllustrationForbidden />}
      subTitle={t("errors.forbidden.description")}
      title={t("errors.forbidden.title")}
    />
  );
}
