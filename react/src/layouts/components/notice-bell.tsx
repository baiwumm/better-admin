import type { AppNotification } from "@/lib/api-types";
import type { LucideIcon } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  cn,
  Drawer,
  ListBox,
  Skeleton,
  Tabs,
  Typography,
  useOverlayState,
  Spinner,
} from "@heroui/react";
import { AlarmClock, Bell, BellRing, Settings } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import {
  fetchNotifications,
  fetchUnreadCount,
  readAllNotifications,
  readNotification,
} from "@/features/notice/notification-api";
import { useTranslation } from "@/i18n";
import { formatRelativeTime } from "@/lib/format-date";

type NoticeBellTab = "unread" | "all";

/** 通知类型 → 图标（装饰性，aria-hidden） */
const NOTIFICATION_ICONS: Record<AppNotification["type"], LucideIcon> = {
  notice_publish: BellRing,
  notice_remind: AlarmClock,
  system: Settings,
};

/**
 * 顶栏通知铃铛（契约 v1.7.0，站内信）：
 * - 未读数经 useQuery refetchInterval 60s 轮询（红点 Badge）；
 * - 抽屉面板展示通知列表（最新在前），点击条目标记已读并跳转 link；
 * - 「全部已读」一键清零。
 */
export function NoticeBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bellState = useOverlayState();
  const [activeTab, setActiveTab] = useState<NoticeBellTab>("unread");
  const [isOpeningMyNotices, setIsOpeningMyNotices] = useState(false);

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount = unreadQuery.data?.count ?? 0;

  const listQuery = useQuery({
    queryKey: ["notifications", "list", activeTab],
    queryFn: () =>
      fetchNotifications({
        page: 1,
        pageSize: 20,
        unreadOnly: activeTab === "unread",
      }),
    enabled: bellState.isOpen,
    staleTime: 0,
  });
  const notifications = listQuery.data?.data ?? [];
  const emptyTitle = useMemo(
    () =>
      activeTab === "unread"
        ? t("layout.header.noUnreadNotifications")
        : t("layout.header.noNotifications"),
    [activeTab, t],
  );

  const invalidateNotifications = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const readAllMutation = useMutation({
    mutationFn: readAllNotifications,
    onSuccess: () => invalidateNotifications(),
  });

  const readOneMutation = useMutation({
    mutationFn: readNotification,
    onSuccess: () => invalidateNotifications(),
  });

  const handleItemClick = useCallback(
    (id: string, link: string | null) => {
      if (!link) {
        readOneMutation.mutate(id);

        return;
      }
      // 标记已读后跳转（跳转即可读，失败静默）
      readOneMutation.mutate(id);
      bellState.close();
      void navigate({ to: link });
    },
    [readOneMutation, bellState, navigate],
  );

  const openBell = useCallback(() => {
    setActiveTab("unread");
    bellState.open();
  }, [bellState]);

  const openMyNotices = useCallback(() => {
    const run = async () => {
      setIsOpeningMyNotices(true);
      bellState.close();
      try {
        await navigate({ to: "/my-notices" });
      } finally {
        setIsOpeningMyNotices(false);
      }
    };

    void run();
  }, [bellState, navigate]);

  return (
    <>
      {/* 铃铛按钮 + 未读红点（0 条不显示） */}
      <Badge.Anchor>
        <Button
          isIconOnly
          aria-label={t("layout.header.notifications")}
          size="sm"
          variant="ghost"
          onPress={openBell}
        >
          <Bell className="size-4" />
        </Button>
        {unreadCount > 0 && (
          <Badge color="danger" size="sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Badge.Anchor>

      <Drawer state={bellState}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog className="w-100 max-w-full">
              <Drawer.CloseTrigger />
              {/* Tabs 仅作「未读 / 全部」筛选器放 Header 固定（列表为单一视图，
                  切换只重发查询），无需 Tabs.Panel */}
              <Drawer.Header className="flex flex-col gap-3 pb-3">
                <Drawer.Heading className="min-w-0 truncate font-bold">
                  {t("layout.header.notifications")}
                </Drawer.Heading>
                <Tabs
                  aria-label={t("layout.header.notifications")}
                  selectedKey={activeTab}
                  onSelectionChange={(key) =>
                    setActiveTab(String(key) as NoticeBellTab)
                  }
                >
                  <Tabs.ListContainer>
                    <Tabs.List aria-label={t("layout.header.notifications")}>
                      <Tabs.Tab id="unread">
                        {t("layout.header.unreadTab")}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="all">
                        <Tabs.Separator />
                        {t("layout.header.allTab")}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                </Tabs>
              </Drawer.Header>
              <Drawer.Body>
                {/* isPending（而非 isLoading）：抽屉未开时 query 处于 disabled 的
                    pending 态（isLoading 为 false），用 isLoading 会在打开抽屉的
                    首帧闪现「暂无通知」空态，isPending 才稳定呈现骨架屏 */}
                {listQuery.isPending ? (
                  /* 逼真骨架屏：与通知条目同形（图标 + 标题/时间行 + 通栏摘要两行） */
                  <div aria-hidden className="divide-y divide-separator">
                    {Array.from({ length: 5 }, (_, index) => (
                      <div key={index} className="px-4 py-3">
                        <div className="flex w-full items-center gap-3">
                          <Skeleton className="size-9 shrink-0 rounded-full" />
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <Skeleton
                              className="h-3.5 rounded-md"
                              style={{ width: `${60 - (index % 3) * 8}%` }}
                            />
                            <Skeleton className="h-2.5 w-12 shrink-0 rounded-md" />
                          </div>
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5">
                          <Skeleton
                            className="h-2.5 rounded-md"
                            style={{ width: "92%" }}
                          />
                          <Skeleton
                            className="h-2.5 rounded-md"
                            style={{ width: `${64 - (index % 3) * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-10">
                    <EmptyContent title={emptyTitle} />
                  </div>
                ) : (
                  <ListBox
                    aria-label={t("layout.header.notifications")}
                    className="w-full gap-0 divide-y divide-separator p-0"
                    selectionMode="none"
                    onAction={(key) => {
                      const notification = notifications.find(
                        (n) => n.id === key,
                      );

                      if (notification) {
                        handleItemClick(notification.id, notification.link);
                      }
                    }}
                  >
                    {notifications.map((notification) => {
                      const isUnread = notification.readAt === null;
                      const Icon =
                        NOTIFICATION_ICONS[notification.type] ?? Bell;

                      return (
                        <ListBox.Item
                          key={notification.id}
                          className={cn(
                            "w-full rounded-none px-4 py-3 text-start transition-all duration-200 mt-0",
                            "focus-visible:bg-default/60 focus-visible:outline-hidden focus-visible:ring-0",
                            "hover:bg-default/60",
                          )}
                          id={notification.id}
                          textValue={notification.title}
                        >
                          <div className="flex w-full min-w-0 flex-col gap-1.5">
                            <div className="flex w-full items-center gap-3">
                              <Badge.Anchor>
                                <div
                                  aria-hidden
                                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
                                >
                                  <Icon className="size-4" />
                                </div>
                                {isUnread && <Badge color="danger" size="sm" />}
                              </Badge.Anchor>

                              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                <Typography
                                  className={cn(
                                    "min-w-0 truncate",
                                    isUnread && "font-medium",
                                  )}
                                  type="body-sm"
                                >
                                  {notification.title}
                                </Typography>
                                <Typography
                                  className="shrink-0"
                                  color="muted"
                                  type="body-xs"
                                >
                                  {formatRelativeTime(
                                    notification.createdAt,
                                    i18n.language,
                                  )}
                                </Typography>
                              </div>
                            </div>
                            {notification.content ? (
                              <Typography
                                className="line-clamp-2"
                                color="muted"
                                type="body-xs"
                              >
                                {notification.content}
                              </Typography>
                            ) : null}
                          </div>
                        </ListBox.Item>
                      );
                    })}
                  </ListBox>
                )}
                {listQuery.data &&
                  listQuery.data.pagination.total > notifications.length && (
                    <Typography
                      className="pb-1 pt-2 text-center"
                      color="muted"
                      type="body-xs"
                    >
                      {t("layout.header.moreNotifications")}
                    </Typography>
                  )}
              </Drawer.Body>
              <Drawer.Footer className="grid w-full grid-cols-2 gap-2">
                <Button
                  fullWidth
                  isDisabled={unreadCount === 0 || isOpeningMyNotices}
                  isPending={readAllMutation.isPending}
                  variant="outline"
                  onPress={() => readAllMutation.mutate()}
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {t("layout.header.readAll")}
                    </>
                  )}
                </Button>
                <Button
                  fullWidth
                  isDisabled={readAllMutation.isPending}
                  isPending={isOpeningMyNotices}
                  onPress={openMyNotices}
                >
                  {t("layout.header.viewMyNotices")}
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
