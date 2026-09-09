import { Button } from "@heroui/react";
import { Link, useRouter } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";
import { type ErrorRedirectState } from "@/router";

/**
 * 通用错误兜底（全屏），用作 /500 路由页组件。
 * 页面渲染期间抛出未捕获错误时，根路由 errorComponent 携带出错 URL
 * （router state.from）跳转至本页展示，避免白屏。
 * 「重试」语义：携带 from 时回原 URL 重新渲染（错误边界随卸载重置）；
 * 直接访问 /500（无 from）时整页刷新兜底。与 403/404 的默认双按钮区分。
 */
export function GeneralErrorPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ErrorPageShell
      actions={
        <>
          <Button
            className="btn-shine"
            variant="primary"
            onPress={() => {
              const from = (
                router.state.location.state as ErrorRedirectState | undefined
              )?.from;

              if (from) {
                void router.navigate({ href: from });
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
