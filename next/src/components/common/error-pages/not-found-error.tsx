"use client";

import { IllustrationNotFound } from "./illustration-not-found";
import { ResultPage } from "./result-page";

import { useTranslation } from "@/i18n";

type NotFoundErrorPageProps = {
  /** 渲染形态,透传 ResultPage(菜单页用 embedded,错误跳转页默认全屏) */
  variant?: "fullscreen" | "embedded";
};

/** 404 页面不存在页(/404 路由与 /exception/404 菜单页)。 */
export function NotFoundErrorPage({ variant }: NotFoundErrorPageProps) {
  const { t } = useTranslation();

  return (
    <ResultPage
      image={<IllustrationNotFound />}
      subTitle={t("errors.notFound.description")}
      title={t("errors.notFound.title")}
      variant={variant}
    />
  );
}
