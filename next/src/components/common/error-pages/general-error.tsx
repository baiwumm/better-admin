"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
import { Button } from "@heroui/react";
import Link from "next/link";

import { IllustrationServerError } from "./illustration-server-error";
import { ResultPage } from "./result-page";

import { useTranslation } from "@/i18n";

/**
 * 500 服务器错误页（/500 路由页与 app/error.tsx 错误边界内容）。
 *
 * 「重试」语义：出错方跳转本页时携带 `?from=<原URL>`，存在 from 时
 * 回原 URL 重新渲染；直接访问 /500（无 from）时整页刷新兜底。
 * 与 403/404 的默认双按钮区分。
 */
export function GeneralErrorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  return (
    <ResultPage
      extra={
        <>
          <Button
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
            <Button variant="outline">{t("common.backHome")}</Button>
          </Link>
        </>
      }
      image={<IllustrationServerError />}
      subTitle={t("errors.serverError.description")}
      title={t("errors.serverError.title")}
    />
  );
}
