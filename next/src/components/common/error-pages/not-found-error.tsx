"use client";

import { FileQuestion } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";

/** 404 页面不存在（全屏），用作根路由 notFoundComponent 与 /404 路由。 */
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
