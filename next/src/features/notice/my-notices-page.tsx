"use client";

import type { Notice } from "@/lib/api-types";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  ListBox,
  ProgressBar,
  ScrollShadow,
  SearchField,
  Select,
  Separator,
  Skeleton,
  Typography,
  cn,
} from "@heroui/react";
import { ArrowLeft, ArrowRight, BellRing, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { fetchNoticeDetail } from "./notice-api";
import { sanitizeNoticeHtml } from "./sanitize";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { ErrorContent } from "@/components/common/error-content/error-content";
import { UserInfo } from "@/components/common/user-info/user-info";
import { createListStore } from "@/hooks/create-list-store";
import { useListQuery } from "@/hooks/use-list-query";
import { useTranslation } from "@/i18n";
import { formatDateTime, formatRelativeTime } from "@/lib/format-date";

type MyNoticeReadStatus = "all" | "read" | "unread";

const useMyNoticesListStore = createListStore<{
  readStatus: MyNoticeReadStatus;
}>({
  readStatus: "all",
});

function NoticeListSkeleton() {
  return (
    <div aria-hidden className="flex-1 flex flex-col divide-y divide-separator">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <Skeleton className="mt-3 h-4 w-5/6 rounded-md" />
          <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function NoticeDetailSkeleton() {
  return (
    <div aria-hidden className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-44 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
      <Separator />
      <div className="flex-1 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="mt-3 h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function MyNoticesPage() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  // 用原生 router.replace 同步地址栏（避免 bprogress 进度条在页内切换时闪烁）
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlNoticeId = searchParams.get("noticeId");
  const queryClient = useQueryClient();

  const page = useMyNoticesListStore((s) => s.page);
  const search = useMyNoticesListStore((s) => s.search);
  const filters = useMyNoticesListStore((s) => s.filters);
  const setPage = useMyNoticesListStore((s) => s.setPage);
  const setSearch = useMyNoticesListStore((s) => s.setSearch);
  const setFilters = useMyNoticesListStore((s) => s.setFilters);

  const [searchInput, setSearchInput] = useState(search);
  const [isDetailClosed, setIsDetailClosed] = useState(false);

  const {
    data: notices,
    pagination,
    isLoading,
    isFetching,
  } = useListQuery<Notice, { readStatus: MyNoticeReadStatus }>({
    store: useMyNoticesListStore,
    queryKeyPrefix: ["my-notices"],
    path: "/notices/mine",
    searchParam: "keyword",
    buildFilters: (nextFilters) =>
      nextFilters.readStatus === "all"
        ? {}
        : { readStatus: nextFilters.readStatus },
  });

  const updateSelectedNotice = useCallback(
    (noticeId: string | null) => {
      setIsDetailClosed(noticeId === null);
      const params = new URLSearchParams(searchParams.toString());

      if (noticeId) {
        params.set("noticeId", noticeId);
      } else {
        params.delete("noticeId");
      }
      const qs = params.toString();

      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (urlNoticeId) {
      setIsDetailClosed(false);
    }
  }, [urlNoticeId]);

  const selectedNoticeId = useMemo(() => {
    if (urlNoticeId && notices.some((notice) => notice.id === urlNoticeId)) {
      return urlNoticeId;
    }

    if (isDetailClosed) {
      return null;
    }

    return notices[0]?.id ?? null;
  }, [isDetailClosed, notices, urlNoticeId]);

  useEffect(() => {
    if (notices.length === 0) {
      if (urlNoticeId) updateSelectedNotice(null);

      return;
    }
    if (!selectedNoticeId) {
      return;
    }
    if (selectedNoticeId !== urlNoticeId) {
      updateSelectedNotice(selectedNoticeId);
    }
  }, [notices.length, selectedNoticeId, updateSelectedNotice, urlNoticeId]);

  const selectedNotice = useMemo(
    () => notices.find((notice) => notice.id === selectedNoticeId) ?? null,
    [notices, selectedNoticeId],
  );

  const detailQuery = useQuery({
    queryKey: ["notices", "detail", selectedNoticeId],
    queryFn: () => fetchNoticeDetail(selectedNoticeId ?? ""),
    enabled: Boolean(selectedNoticeId),
    staleTime: 0,
  });

  useEffect(() => {
    if (
      !selectedNoticeId ||
      !detailQuery.data?.myReadAt ||
      selectedNotice?.myReadAt
    ) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["my-notices"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [
    detailQuery.data?.myReadAt,
    queryClient,
    selectedNotice?.myReadAt,
    selectedNoticeId,
  ]);

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput, setSearch]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
  }, [setSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil((pagination.total || 0) / Math.max(pagination.pageSize, 1)),
  );
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < totalPages;
  const selectedNoticeKeys = useMemo(
    () => (selectedNoticeId ? new Set([selectedNoticeId]) : new Set<string>()),
    [selectedNoticeId],
  );
  const currentIndex = useMemo(
    () =>
      selectedNoticeId
        ? notices.findIndex((notice) => notice.id === selectedNoticeId)
        : -1,
    [notices, selectedNoticeId],
  );
  const prevNoticeId =
    currentIndex > 0 ? (notices[currentIndex - 1]?.id ?? null) : null;
  const nextNoticeId =
    currentIndex >= 0 && currentIndex < notices.length - 1
      ? (notices[currentIndex + 1]?.id ?? null)
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface lg:flex-row">
      <div className="flex h-[44%] min-h-80 flex-col border-b border-separator bg-content1 lg:h-full lg:w-90 lg:min-w-90 lg:border-r lg:border-b-0">
        {/* 搜索 / 筛选 / 翻页刷新中：keepPreviousData 期间 isLoading 为 false，
            旧数据仍展示，进度条定位在本区下边框处（与边框同高），不产生布局位移；
            首次加载走列表骨架屏 */}
        <div className="relative shrink-0 border-b border-separator p-3.5">
          <div className="flex items-center gap-2">
            <Select
              aria-label={t("features.myNotices.filter.readStatus")}
              className="w-32 shrink-0"
              value={filters.readStatus}
              variant="secondary"
              onChange={(value) =>
                setFilters({
                  readStatus: (value ?? "all") as MyNoticeReadStatus,
                })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox selectionMode="single">
                  <ListBox.Item
                    id="all"
                    textValue={t("features.myNotices.filter.all")}
                  >
                    {t("features.myNotices.filter.all")}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item
                    id="unread"
                    textValue={t("features.myNotices.filter.unread")}
                  >
                    {t("features.myNotices.filter.unread")}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item
                    id="read"
                    textValue={t("features.myNotices.filter.read")}
                  >
                    {t("features.myNotices.filter.read")}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <SearchField
              aria-label={t("features.myNotices.search.placeholder")}
              className="min-w-0 flex-1"
              value={searchInput}
              variant="secondary"
              onChange={setSearchInput}
              onClear={clearSearch}
              onSubmit={applySearch}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={t("features.myNotices.search.placeholder")}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>

          {isFetching && !isLoading ? (
            <ProgressBar
              isIndeterminate
              aria-label={t("common.loading")}
              className="absolute inset-x-0 bottom-0"
            >
              <ProgressBar.Track className="h-px rounded-none bg-transparent">
                <ProgressBar.Fill className="bg-accent" />
              </ProgressBar.Track>
            </ProgressBar>
          ) : null}
        </div>

        <ScrollShadow className="min-h-0 flex-1">
          {isLoading ? (
            <NoticeListSkeleton />
          ) : notices.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 py-10">
              <EmptyContent
                description={
                  filters.readStatus === "unread"
                    ? t("features.myNotices.empty.unread")
                    : filters.readStatus === "read"
                      ? t("features.myNotices.empty.read")
                      : search
                        ? t("features.myNotices.empty.search")
                        : t("features.myNotices.empty.all")
                }
                icon={BellRing}
                title={t("features.myNotices.empty.title")}
              />
            </div>
          ) : (
            // 注意：选中态由路由驱动（selectedKeys 受控），每次点击都必须触发导航。
            // React Aria 默认 toggle 行为下，列表已有选中项时单击只会“改选中”、
            // 不会触发 onAction（表现为“第一条激活后点其它项无反应”），
            // 故与 sidebar-menu 一致改用 selectionBehavior="replace" +
            // onSelectionChange 兜底导航（键盘 Enter 仍走 onAction）；
            // disallowEmptySelection 避免点击已选中项出现取消选中的抖动。
            <ListBox
              disallowEmptySelection
              aria-label={t("features.myNotices.title")}
              className="w-full gap-0 divide-y divide-separator p-0"
              selectedKeys={selectedNoticeKeys}
              selectionBehavior="replace"
              selectionMode="single"
              onAction={(key) => updateSelectedNotice(String(key))}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0];

                if (key) updateSelectedNotice(String(key));
              }}
            >
              {notices.map((notice) => {
                const isRead = Boolean(notice.myReadAt);

                return (
                  <ListBox.Item
                    key={notice.id}
                    className={cn(
                      "w-full rounded-none border-l-2 border-l-transparent px-4 py-4 text-start transition-all duration-200",
                      "focus-visible:outline-hidden focus-visible:ring-0",
                      "data-[selected=true]:border-l-accent data-[selected=true]:bg-accent/10",
                    )}
                    id={notice.id}
                    textValue={notice.title}
                  >
                    <div className="flex w-full min-w-0 flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-3">
                        {/* 发布人被删除（publisherId 置空）时整体占位；否则头像 + 名称 + 邮箱 */}
                        <UserInfo
                          className="min-w-0 flex-1"
                          user={
                            notice.publisherId && notice.publisherName
                              ? {
                                  username: notice.publisherName,
                                  displayName: notice.publisherName,
                                  email: notice.publisherEmail,
                                  avatar: notice.publisherAvatar,
                                }
                              : null
                          }
                        />
                        <div className="flex shrink-0 items-center gap-2">
                          {!isRead && (
                            <span
                              aria-hidden
                              className="size-2 rounded-full bg-accent"
                            />
                          )}
                          <Typography color="muted" type="body-xs">
                            {formatRelativeTime(
                              notice.publishTime,
                              i18n.language,
                            )}
                          </Typography>
                        </div>
                      </div>

                      <Typography
                        className={cn(
                          "line-clamp-2 leading-6",
                          isRead ? "font-medium" : "font-semibold",
                        )}
                        type="body-sm"
                      >
                        {notice.title}
                      </Typography>

                      <div className="flex items-center justify-between gap-2">
                        <Typography
                          className="line-clamp-1"
                          color="muted"
                          type="body-xs"
                        >
                          {isRead && notice.myReadAt
                            ? t("features.myNotices.status.readAt", {
                                time: formatDateTime(
                                  notice.myReadAt,
                                  i18n.language,
                                ),
                              })
                            : t("features.myNotices.status.unreadHint")}
                        </Typography>
                        {notice.isTop && (
                          <Chip
                            className="shrink-0"
                            color="warning"
                            size="sm"
                            variant="soft"
                          >
                            {t("features.notices.status.top")}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </ListBox.Item>
                );
              })}
            </ListBox>
          )}
        </ScrollShadow>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-separator px-4 py-3">
          <Typography color="muted" type="body-xs">
            {t("features.myNotices.pagination", {
              page: pagination.page,
              total: totalPages,
            })}
          </Typography>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              isDisabled={!canPrev || isFetching}
              size="sm"
              variant="ghost"
              onPress={() => setPage(page - 1)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              isIconOnly
              isDisabled={!canNext || isFetching}
              size="sm"
              variant="ghost"
              onPress={() => setPage(page + 1)}
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 bg-surface">
        {!selectedNoticeId ? (
          <div className="flex h-full items-center justify-center px-6 py-10">
            <EmptyContent
              description={t("features.myNotices.empty.selectHint")}
              icon={Search}
              title={t("features.myNotices.empty.selectTitle")}
            />
          </div>
        ) : detailQuery.isLoading ? (
          <NoticeDetailSkeleton />
        ) : detailQuery.isError || !detailQuery.data ? (
          <div className="flex h-full items-center justify-center px-6 py-10">
            <ErrorContent
              action={
                <Button size="sm" onPress={() => void detailQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              }
              description={t("features.notices.detail.notVisible")}
              title={t("features.notices.detail.notVisibleTitle")}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  isIconOnly
                  aria-label={t("common.close")}
                  className="shrink-0"
                  size="sm"
                  variant="ghost"
                  onPress={() => updateSelectedNotice(null)}
                >
                  <X className="size-4" />
                </Button>
                <Typography className="flex-1 truncate font-semibold" type="h5">
                  {detailQuery.data.title}
                </Typography>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  isDisabled={!prevNoticeId}
                  size="sm"
                  variant="outline"
                  onPress={() => updateSelectedNotice(prevNoticeId)}
                >
                  <ArrowLeft className="size-4" />
                  {t("features.myNotices.detail.prev")}
                </Button>
                <Button
                  isDisabled={!nextNoticeId}
                  size="sm"
                  variant="outline"
                  onPress={() => updateSelectedNotice(nextNoticeId)}
                >
                  {t("features.myNotices.detail.next")}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
              {/* 发布人被删除（publisherId 置空）时整体占位；否则头像 + 名称 + 邮箱 */}
              <UserInfo
                className="min-w-0 flex-1"
                user={
                  detailQuery.data.publisherId && detailQuery.data.publisherName
                    ? {
                        username: detailQuery.data.publisherName,
                        displayName: detailQuery.data.publisherName,
                        email: detailQuery.data.publisherEmail,
                        avatar: detailQuery.data.publisherAvatar,
                      }
                    : null
                }
              />

              <Typography
                className="shrink-0 text-right"
                color="muted"
                type="body-xs"
              >
                {formatRelativeTime(
                  detailQuery.data.publishTime,
                  i18n.language,
                )}
              </Typography>
            </div>

            <Separator />

            <ScrollShadow className="min-h-0 flex-1 px-5 py-5 md:px-6">
              {detailQuery.data.content ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeNoticeHtml(detailQuery.data.content),
                  }}
                  className="prose-notice text-sm leading-7"
                />
              ) : (
                <p className="text-sm leading-7">{detailQuery.data.title}</p>
              )}
            </ScrollShadow>
          </div>
        )}
      </div>
    </div>
  );
}
