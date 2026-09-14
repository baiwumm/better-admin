"use client";

import { IllustrationForbidden } from "./illustration-forbidden";
import { ResultPage } from "./result-page";

import { useTranslation } from "@/i18n";

type ForbiddenErrorPageProps = {
  /** 渲染形态,透传 ResultPage(菜单页用 embedded,错误跳转页默认全屏) */
  variant?: "fullscreen" | "embedded";
};

/** 403 无权限页(/403 路由与 /exception/403 菜单页)。 */
export function ForbiddenErrorPage({ variant }: ForbiddenErrorPageProps) {
  const { t } = useTranslation();

  return (
    <ResultPage
      image={<IllustrationForbidden />}
      subTitle={t("errors.forbidden.description")}
      title={t("errors.forbidden.title")}
      variant={variant}
    />
  );
}
