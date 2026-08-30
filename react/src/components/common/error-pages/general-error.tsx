import { Button } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";

/**
 * 通用错误兜底（全屏），用作根路由 errorComponent：
 * 页面渲染期间抛出未捕获错误时展示，避免白屏。
 * 操作区带「重试」（整页刷新重新渲染），与 403/404 的默认双按钮区分。
 */
export function GeneralErrorPage() {
  const { t } = useTranslation();

  return (
    <ErrorPageShell
      actions={
        <>
          <Button
            className="btn-shine"
            variant="primary"
            onPress={() => window.location.reload()}
          >
            {t("common.retry")}
          </Button>
          <Link to="/">
            <Button className="btn-shine" variant="outline">
              {t("common.backHome")}
            </Button>
          </Link>
        </>
      }
      description={t("errors.serverError.description")}
      icon={<TriangleAlert className="size-7" />}
      status="500"
      title={t("errors.serverError.title")}
      tone="warning"
    />
  );
}
