"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

import { useTranslation } from "@/i18n";

/**
 * 通用错误兜底（全屏），用作 /500 路由页与 app/error.tsx 错误边界内容。
 *
 * 「重试」语义与 React 版对齐：出错方跳转本页时携带 `?from=<原URL>`，
 * 存在 from 时回原 URL 重新渲染；直接访问 /500（无 from）时整页刷新兜底。
 * 与 403/404 的默认双按钮区分。
 */
export function GeneralErrorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  return (
    <ErrorPageShell
      actions={
        <>
          <Button
            className="btn-shine"
            variant="primary"
            onPress={() => {
              if (from) {
                void router.push(from);
              } else {
                window.location.reload();
              }
            }}
          >
            {t("common.retry")}
          </Button>
          <Link href="/">
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
