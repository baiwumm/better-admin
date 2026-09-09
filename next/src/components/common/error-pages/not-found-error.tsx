"use client";

import { IllustrationNotFound } from "./illustration-not-found";
import { ResultPage } from "./result-page";

import { useTranslation } from "@/i18n";

/** 404 页面不存在页（/404 路由与根 not-found 兜底），操作区用默认双按钮。 */
export function NotFoundErrorPage() {
  const { t } = useTranslation();

  return (
    <ResultPage
      image={<IllustrationNotFound />}
      subTitle={t("errors.notFound.description")}
      title={t("errors.notFound.title")}
    />
  );
}
