"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ScrollShadow,
  Separator,
  Skeleton,
  Typography,
} from "@heroui/react";

import { sanitizeNoticeHtml } from "@/features/notice/sanitize";
import { fetchNoticeDetail } from "@/features/notice/notice-api";
import { ErrorContent } from "@/components/common/error-content/error-content";
import { formatDateTime } from "@/lib/format-date";
import { collectMenuPaths } from "@/lib/menu-utils";
import { useMenuStore } from "@/stores/menu-store";
import { useTabsStore } from "@/stores/tabs-store";
import { useTranslation } from "@/i18n";

/** 加载骨架：与最终卡片同形（信息栏 + 大标题 + 元信息 + 正文块） */
function DetailSkeleton() {
  return (
    <Card className="rounded-3xl shadow-sm">
      <Card.Content className="flex flex-col gap-5 p-6 md:p-8">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-9 w-2/3 rounded-xl" />
        <Skeleton className="h-3.5 w-1/3 rounded-md" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </Card.Content>
    </Card>
  );
}

/**
 * 公告详情页（全员消费端，契约 v1.7.0 GET /notices/:id）：
 * 服务端做可见性校验（super_admin / SEARCH 位 / 发布范围内 / 收到过该公告站内信）；
 * 范围内用户进详情自动记首次已读（myReadAt）。
 * 非菜单路由（从铃铛通知 / 我的公告入口跳转），登录即可达、不走菜单权限。
 *
 * 版式（对齐 SaaS 后台惯例）：Card 主容器承载返回入口 / 类型 Chip / 大标题 /
 * 元信息 / Divider / ScrollShadow 正文卡片 / 底部已读状态，留白充足。
 */
export function NoticeDetailPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { noticeId } = useParams<{ noticeId: string }>();
  const pathname = usePathname();
  const menuTree = useMenuStore((s) => s.menus);
  const syncMeta = useTabsStore((s) => s.syncMeta);

  // 公告管理菜单可达性：决定返回入口（返回列表 / 回到控制台）。
  // 无公告菜单权限的消费用户点「返回列表」会撞列表页门卫 403，须降级。
  const canAccessList = useMemo(
    () => (menuTree ? collectMenuPaths(menuTree).has("/org/notices") : false),
    [menuTree],
  );

  const detailQuery = useQuery({
    queryKey: ["notices", "detail", noticeId],
    queryFn: () => fetchNoticeDetail(noticeId),
    staleTime: 0,
  });

  const notice = detailQuery.data;

  // 动态路由标题：把公告标题写入标签页元数据快照（tabs meta），
  // 标签页据此显示具体标题，面包屑渲染「公告详情 > 标题」两级结构；
  // 快照随 tabs 持久化，刷新后仍可恢复，关闭标签时随治理清理。
  useEffect(() => {
    if (!notice) return;
    syncMeta({
      [pathname]: {
        title: notice.title,
        parentTitle: t("features.notices.detail.titleFallback"),
      },
    });
  }, [notice, pathname, syncMeta, t]);

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.isError || !notice) {
    return (
      <div className="py-10">
        <ErrorContent
          action={
            <Button size="sm" onPress={() => router.push("/")}>
              {t("features.notices.detail.backToConsole")}
            </Button>
          }
          description={t("features.notices.detail.notVisible")}
          title={t("features.notices.detail.notVisibleTitle")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card className="rounded-3xl shadow-sm">
        <Card.Content className="flex flex-col gap-5 p-6 md:p-8">
          {/* 返回入口：有公告菜单权限 → 返回列表；否则降级回控制台 */}
          <div>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => router.push(canAccessList ? "/org/notices" : "/")}
            >
              <ArrowLeft className="size-4" />
              {canAccessList
                ? t("features.notices.detail.backToList")
                : t("features.notices.detail.backToConsole")}
            </Button>
          </div>

          {/* 信息栏：类型标签 + 置顶标识 */}
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="accent" size="sm" variant="soft">
              {t("features.notices.detail.typeNotice")}
            </Chip>
            {notice.isTop && (
              <Chip color="warning" size="sm" variant="soft">
                {t("features.notices.status.top")}
              </Chip>
            )}
          </div>

          {/* 标题：大字号加粗，leading-relaxed 保证长标题换行阅读间距 */}
          <Typography className="font-bold leading-relaxed" type="h3">
            {notice.title}
          </Typography>

          {/* 元信息：发布人头像（有头像才显示，sm 最小尺寸）+ 发布人 · 发布时间 */}
          <div className="flex items-center gap-2">
            {notice.publisherAvatar && (
              <Avatar
                className="shrink-0"
                color="accent"
                size="sm"
                variant="soft"
              >
                <Avatar.Image
                  alt={notice.publisherName ?? "—"}
                  src={notice.publisherAvatar}
                />
                <Avatar.Fallback>
                  {(notice.publisherName ?? "—").slice(0, 1)}
                </Avatar.Fallback>
              </Avatar>
            )}
            <Typography color="muted" type="body-xs">
              {t("features.notices.detail.publisher", {
                name: notice.publisherName ?? "—",
                time: formatDateTime(notice.publishTime, i18n.language),
              })}
            </Typography>
          </div>

          <Separator />

          {/* 正文：限高滚动容器防超长内容撑爆页面；content 缺失回退标题文本 */}
          <ScrollShadow className="max-h-[480px] rounded-2xl bg-content2 p-5">
            {notice.content ? (
              <div
                // 内容来自 Tiptap 编辑并经 DOMPurify 消毒（sanitizeNoticeHtml）
                dangerouslySetInnerHTML={{
                  __html: sanitizeNoticeHtml(notice.content),
                }}
                className="prose-notice text-sm leading-7"
              />
            ) : (
              <p className="text-sm leading-7">{notice.title}</p>
            )}
          </ScrollShadow>

          {/* 底部状态：已读时间弱化展示 */}
          <Typography color="muted" type="body-xs">
            {notice.myReadAt
              ? t("features.notices.detail.readAtTip", {
                  time: formatDateTime(notice.myReadAt, i18n.language),
                })
              : t("features.notices.detail.readRecorded")}
          </Typography>
        </Card.Content>
      </Card>
    </div>
  );
}
