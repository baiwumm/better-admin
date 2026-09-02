"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Chip, Description, Skeleton, Typography } from "@heroui/react";

import { sanitizeNoticeHtml } from "@/features/notice/sanitize";
import { fetchNoticeDetail } from "@/features/notice/notice-api";
import { ErrorContent } from "@/components/common/error-content/error-content";
import { useTranslation } from "@/i18n";

/**
 * 公告详情页（全员消费端，契约 v1.7.0 GET /notices/:id）：
 * 服务端做可见性校验；范围内用户进详情自动记首次已读。
 * 非菜单路由（从铃铛通知 / 我的公告入口跳转）。
 */
export function NoticeDetailPage() {
  const { t } = useTranslation();
  const { noticeId } = useParams<{ noticeId: string }>();

  const detailQuery = useQuery({
    queryKey: ["notices", "detail", noticeId],
    queryFn: () => fetchNoticeDetail(noticeId),
    staleTime: 0,
  });

  const notice = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
        <Skeleton className="h-8 w-2/3 rounded-2xl" />
        <Skeleton className="h-4 w-1/3 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (detailQuery.isError || !notice) {
    return (
      <div className="py-10">
        <ErrorContent
          action={
            <Link href="/">{t("features.notices.detail.backToConsole")}</Link>
          }
          description={t("features.notices.detail.notVisible")}
          title={t("features.notices.detail.notVisibleTitle")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
      <Link
        className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-default-foreground"
        href="/org/notices"
      >
        <ArrowLeft className="size-4" />
        {t("features.notices.detail.backToList")}
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Typography className="truncate font-semibold" type="body-sm">
            {notice.title}
          </Typography>
          {notice.isTop && (
            <Chip color="warning" size="sm" variant="soft">
              {t("features.notices.status.top")}
            </Chip>
          )}
        </div>
        <Typography color="muted" type="body-xs">
          {t("features.notices.detail.publisher", {
            name: notice.publisherName ?? "—",
            time: new Date(notice.publishTime).toLocaleString(),
          })}
        </Typography>
      </div>

      {/* 富文本内容（DOMPurify 消毒渲染，阻断存储型 XSS） */}
      <div
        // 内容来自 Tiptap 编辑并经 DOMPurify 消毒（sanitizeNoticeHtml）
        dangerouslySetInnerHTML={{
          __html: sanitizeNoticeHtml(notice.content ?? ""),
        }}
        className="prose-notice rounded-3xl border border-border px-5 py-4 text-sm"
      />

      <Description>{t("features.notices.detail.readRecorded")}</Description>
    </div>
  );
}
