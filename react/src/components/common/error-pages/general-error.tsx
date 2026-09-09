import { Button } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";

type GeneralErrorPageProps = {
  /** 自定义重试回调；缺省时整页刷新（根路由布局外兜底场景）。 */
  onRetry?: () => void;
};

/**
 * 通用错误兜底。两处使用：
 * - Admin 布局内：KeepAliveOutlet 的面板级错误边界传入 onRetry
 *   （重置边界并重挂载面板实例），仅当前面板显示、其余标签不受影响；
 * - 布局外兜底（根路由 errorComponent）：无 onRetry，整页刷新。
 * 与 403/404 的默认双按钮区分。
 */
export function GeneralErrorPage({ onRetry }: GeneralErrorPageProps) {
  const { t } = useTranslation();

  return (
    <ErrorPageShell
      actions={
        <>
          <Button
            className="btn-shine"
            variant="primary"
            onPress={() => {
              if (onRetry) {
                onRetry();
              } else {
                window.location.reload();
              }
            }}
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
