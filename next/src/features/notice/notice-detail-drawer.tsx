"use client";

import type { NoticeDetail, NoticeReadStatEntry } from "@/lib/api-types";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Chip,
  Description,
  Drawer,
  ProgressBar,
  Skeleton,
  Tab,
  Tabs,
  Typography,
  toast,
  useOverlayState,
} from "@heroui/react";
import { BellRing } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  fetchNoticeDetail,
  fetchNoticeReadStats,
  getNoticeErrorMessage,
  remindNotice,
} from "./notice-api";
import { sanitizeNoticeHtml } from "./sanitize";

import { useDict } from "@/stores/dict-store";
import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";

/**
 * 公告详情抽屉（管理侧，契约 v1.7.0）：
 * 公告信息 + 富文本内容（DOMPurify 消毒渲染）+ 已读率 + 已读/未读 Tab
 * （分页名单）+ 一键催办（24h 防频由后端 409 拦截）。
 *
 * 详情数据由抽屉内部按 id 拉取（列表行 Notice 不含 content/scopes，
 * 不能强转渲染）；同时把真实详情写入 ["notices","detail",id] 缓存，
 * 与编辑弹窗（同 key）共享，保证「先看详情再编辑」回填一致。
 */
export function NoticeDetailDrawer({
  state,
  notice,
}: {
  state: ReturnType<typeof useOverlayState>;
  notice: NoticeDetail | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canEdit } = useMenuPermissions();

  // 详情：抽屉打开时按 id 拉取完整数据（含 content/scopes/readCount 等）；
  // 未返回前用列表行信息兜底渲染（标题等基础字段已具备）
  const detailQuery = useQuery({
    queryKey: ["notices", "detail", notice?.id ?? ""],
    queryFn: () => fetchNoticeDetail(notice!.id),
    enabled: Boolean(notice) && state.isOpen,
    staleTime: 0,
  });
  const detail = detailQuery.data ?? notice;

  const [readTab, setReadTab] = useState<"read" | "unread">("unread");
  const [readPage, setReadPage] = useState(1);
  const [unreadPage, setUnreadPage] = useState(1);

  // 已读 / 未读名单分别独立查询：queryKey 各自固定（只含自身页码），
  // 切换 Tab 仅切换取哪个查询的数据，不触发另一 Tab 重新请求；
  // staleTime 内抽屉开合 / Tab 来回切换复用缓存（催办后经 invalidate 强制刷新）
  const READ_STATS_STALE_MS = 60_000;

  const readStatsQuery = useQuery({
    queryKey: ["notices", "read-stats", notice?.id ?? "", "read", readPage],
    queryFn: () => fetchNoticeReadStats(notice!.id, "read", readPage, 10),
    enabled: Boolean(notice) && state.isOpen,
    placeholderData: keepPreviousData,
    staleTime: READ_STATS_STALE_MS,
  });
  const unreadStatsQuery = useQuery({
    queryKey: ["notices", "read-stats", notice?.id ?? "", "unread", unreadPage],
    queryFn: () => fetchNoticeReadStats(notice!.id, "unread", unreadPage, 10),
    enabled: Boolean(notice) && state.isOpen,
    placeholderData: keepPreviousData,
    staleTime: READ_STATS_STALE_MS,
  });
  const activeStatsQuery =
    readTab === "read" ? readStatsQuery : unreadStatsQuery;
  const entries = activeStatsQuery.data?.data ?? [];
  const pagination = activeStatsQuery.data?.pagination;

  const remindMutation = useMutation({
    mutationFn: () => remindNotice(notice!.id),
    onSuccess: () => {
      // 催办后未读名单与统计刷新（提示反馈统一由 handleRemind 的 toast.promise 呈现）
      void queryClient.invalidateQueries({
        queryKey: ["notices", "read-stats", notice?.id ?? ""],
      });
    },
  });

  const handleRemind = useCallback(() => {
    toast.promise(remindMutation.mutateAsync(), {
      loading: t("features.notices.detail.reminding"),
      success: (result) =>
        t("features.notices.detail.remindSuccess", {
          count: result.remindedCount,
        }),
      error: (error) => getNoticeErrorMessage(error),
    });
  }, [remindMutation, t]);

  const switchTab = useCallback((key: string | number) => {
    setReadTab(String(key) as "read" | "unread");
  }, []);

  // 公告状态文案走字典（notice_status，字典管理可维护）
  const noticeStatusDict = useDict("notice_status");
  const statusLabel = useCallback(
    (value: string) => {
      const item = noticeStatusDict.find((d) => d.value === value);

      return item ? (item.i18nKey ? t(item.i18nKey) : item.label) : value;
    },
    [noticeStatusDict, t],
  );

  const readRate = detail?.readRate;
  const readRatePercent = useMemo(
    () =>
      readRate === null || readRate === undefined ? null : Math.round(readRate),
    [readRate],
  );

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-140 max-w-full">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="min-w-0 truncate font-bold">
                {detail?.title ?? t("features.notices.detail.titleFallback")}
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4">
              {detail ? (
                <>
                  {/* 公告信息 */}
                  <div className="flex flex-wrap items-center gap-2">
                    {detail.isTop && (
                      <Chip color="warning" size="sm" variant="soft">
                        {t("features.notices.status.top")}
                      </Chip>
                    )}
                    <Chip
                      color={
                        detail.status === "published"
                          ? "success"
                          : detail.status === "draft"
                            ? "default"
                            : "danger"
                      }
                      size="sm"
                      variant="soft"
                    >
                      {statusLabel(detail.status)}
                    </Chip>
                    <Typography color="muted" type="body-xs">
                      {t("features.notices.detail.publisher", {
                        name: detail.publisherName ?? "—",
                        time: new Date(detail.publishTime).toLocaleString(),
                      })}
                    </Typography>
                  </div>

                  {/* 已读率 */}
                  <div className="flex flex-col gap-1 rounded-3xl border border-border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <Description>
                        {t("features.notices.detail.readRate")}
                      </Description>
                      <Typography type="body-xs">
                        {readRatePercent === null
                          ? "—"
                          : `${readRatePercent}%（${detail.readCount}/${detail.totalCount}）`}
                      </Typography>
                    </div>
                    {readRatePercent !== null && (
                      <ProgressBar
                        aria-label={t("features.notices.detail.readRate")}
                        value={readRatePercent}
                      >
                        <ProgressBar.Track>
                          <ProgressBar.Fill />
                        </ProgressBar.Track>
                      </ProgressBar>
                    )}
                  </div>

                  {/* 富文本内容（DOMPurify 消毒渲染，阻断存储型 XSS） */}
                  {detailQuery.isLoading ? (
                    <div
                      aria-hidden
                      className="flex flex-col gap-2 rounded-3xl border border-border px-4 py-3"
                    >
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-4 w-5/6 rounded-md" />
                      <Skeleton className="h-4 w-2/3 rounded-md" />
                    </div>
                  ) : (
                    <div
                      // 内容来自 Tiptap 编辑并经 DOMPurify 消毒（sanitizeNoticeHtml）
                      dangerouslySetInnerHTML={{
                        __html: sanitizeNoticeHtml(detail.content ?? ""),
                      }}
                      className="prose-notice max-h-96 overflow-y-auto rounded-3xl border border-border px-4 py-3 text-sm"
                    />
                  )}

                  {/* 已读/未读 Tab + 催办 */}
                  <Tabs
                    aria-label={t("features.notices.detail.readTabs")}
                    selectedKey={readTab}
                    onSelectionChange={switchTab}
                  >
                    <Tabs.ListContainer>
                      <Tabs.List
                        aria-label={t("features.notices.detail.readTabs")}
                      >
                        <Tab id="unread">
                          {t("features.notices.detail.unreadTab")}
                          <Tabs.Indicator />
                        </Tab>
                        <Tab id="read">
                          {t("features.notices.detail.readTab")}
                          <Tabs.Indicator />
                        </Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>

                  <div className="flex min-h-40 flex-col gap-1">
                    {activeStatsQuery.isLoading ? (
                      /* 骨架屏：与名单行同形（头像圆 + 双行文本） */
                      <div aria-hidden className="flex flex-col gap-2">
                        {Array.from({ length: 4 }, (_, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 rounded-2xl px-2 py-1.5"
                          >
                            <Skeleton className="size-8 rounded-full" />
                            <div className="flex flex-1 flex-col gap-1">
                              <Skeleton className="h-3 w-24 rounded-md" />
                              <Skeleton className="h-2.5 w-32 rounded-md" />
                            </div>
                            <Skeleton className="h-2.5 w-20 rounded-md" />
                          </div>
                        ))}
                      </div>
                    ) : entries.length === 0 ? (
                      <EmptyContent
                        className="py-8"
                        title={t("features.notices.detail.emptyMembers")}
                      />
                    ) : (
                      entries.map((entry: NoticeReadStatEntry) => (
                        <div
                          key={entry.userId}
                          className="flex items-center gap-3 rounded-2xl px-2 py-1.5"
                        >
                          <Avatar
                            key={entry.avatar ?? "fallback"}
                            className="shrink-0"
                            color="accent"
                            size="sm"
                            variant="soft"
                          >
                            {entry.avatar ? (
                              <Avatar.Image
                                alt={entry.displayName}
                                src={entry.avatar}
                              />
                            ) : null}
                            <Avatar.Fallback>
                              {entry.displayName.slice(0, 1)}
                            </Avatar.Fallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <Typography
                              className="truncate font-medium"
                              type="body-sm"
                            >
                              {entry.displayName}
                            </Typography>
                            <Typography
                              className="truncate"
                              color="muted"
                              type="body-xs"
                            >
                              {entry.deptPath ?? entry.username}
                            </Typography>
                          </div>
                          <Typography
                            className="shrink-0"
                            color="muted"
                            type="body-xs"
                          >
                            {entry.readAt
                              ? new Date(entry.readAt).toLocaleString()
                              : "—"}
                          </Typography>
                        </div>
                      ))
                    )}
                  </div>

                  {pagination &&
                    pagination.total > pagination.pageSize &&
                    readTab === "unread" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => setUnreadPage((p) => p + 1)}
                      >
                        {t("features.notices.detail.loadMore")}
                      </Button>
                    )}
                  {pagination &&
                    pagination.total > pagination.pageSize &&
                    readTab === "read" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => setReadPage((p) => p + 1)}
                      >
                        {t("features.notices.detail.loadMore")}
                      </Button>
                    )}

                  {readTab === "unread" && canEdit && (
                    <Button
                      isDisabled={
                        !detail ||
                        detail.status !== "published" ||
                        entries.length === 0
                      }
                      isPending={remindMutation.isPending}
                      variant="outline"
                      onPress={handleRemind}
                    >
                      <BellRing className="size-4" />
                      {remindMutation.isPending
                        ? t("features.notices.detail.reminding")
                        : t("features.notices.detail.remind")}
                    </Button>
                  )}
                </>
              ) : (
                <Description>
                  {t("features.notices.detail.titleFallback")}
                </Description>
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
