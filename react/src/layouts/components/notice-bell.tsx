import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  cn,
  Description,
  Drawer,
  ListBox,
  Skeleton,
  Typography,
  useOverlayState,
} from "@heroui/react";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { keepPreviousData } from "@tanstack/react-query";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import {
  fetchNotifications,
  fetchUnreadCount,
  readAllNotifications,
  readNotification,
} from "@/features/notice/notification-api";
import { useTranslation } from "@/i18n";

/**
 * 顶栏通知铃铛（契约 v1.7.0，站内信）：
 * - 未读数经 useQuery refetchInterval 60s 轮询（红点 Badge）；
 * - 抽屉面板展示通知列表（最新在前），点击条目标记已读并跳转 link；
 * - 「全部已读」一键清零。
 */
export function NoticeBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bellState = useOverlayState();

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount = unreadQuery.data?.count ?? 0;

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => fetchNotifications({ page: 1, pageSize: 20 }),
    enabled: bellState.isOpen,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const notifications = listQuery.data?.data ?? [];

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

  return (
    <>
      {/* 铃铛按钮 + 未读红点（0 条不显示） */}
      <Badge.Anchor>
        <Button
          isIconOnly
          aria-label={t("layout.header.notifications")}
          size="sm"
          variant="ghost"
          onPress={bellState.open}
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
              <Drawer.Header>
                <Drawer.Heading className="min-w-0 truncate font-bold">
                  {t("layout.header.notifications")}
                </Drawer.Heading>
                <Button
                  isDisabled={unreadCount === 0}
                  size="sm"
                  variant="ghost"
                  onPress={() => readAllMutation.mutate()}
                >
                  {t("layout.header.readAll")}
                </Button>
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-2">
                {/* isPending（而非 isLoading）：抽屉未开时 query 处于 disabled 的
                    pending 态（isLoading 为 false），用 isLoading 会在打开抽屉的
                    首帧闪现「暂无通知」空态，isPending 才稳定呈现骨架屏 */}
                {listQuery.isPending ? (
                  /* 逼真骨架屏：与通知条目同形（标题行 + 时间行） */
                  <div aria-hidden className="flex flex-col gap-2">
                    {Array.from({ length: 5 }, (_, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 rounded-3xl px-3 py-2"
                      >
                        <Skeleton className="mt-1.5 size-1.5 shrink-0 rounded-full" />
                        <div className="flex flex-1 flex-col gap-1.5">
                          <Skeleton
                            className="h-3.5 rounded-md"
                            style={{
                              width: `${88 - (index % 3) * 14}%`,
                            }}
                          />
                          <Skeleton className="h-2.5 w-36 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <EmptyContent title={t("layout.header.noNotifications")} />
                ) : (
                  <ListBox
                    aria-label={t("layout.header.notifications")}
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

                      return (
                        <ListBox.Item
                          key={notification.id}
                          className={cn(
                            "flex w-full flex-col items-start gap-0.5 rounded-3xl px-3 py-2 text-start transition-colors",
                            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring hover:bg-default/60",
                            isUnread && "bg-accent/10",
                          )}
                          id={notification.id}
                          textValue={notification.title}
                        >
                          <span className="flex w-full items-center gap-2">
                            {isUnread && (
                              <span
                                aria-hidden
                                className="size-1.5 shrink-0 rounded-full bg-danger"
                              />
                            )}
                            <Typography
                              className={cn(
                                "min-w-0 flex-1 truncate",
                                isUnread && "font-medium",
                              )}
                              type="body-sm"
                            >
                              {notification.title}
                            </Typography>
                          </span>
                          <Typography color="muted" type="body-xs">
                            {new Date(notification.createdAt).toLocaleString()}
                          </Typography>
                        </ListBox.Item>
                      );
                    })}
                  </ListBox>
                )}
                {listQuery.data &&
                  listQuery.data.pagination.total > notifications.length && (
                    <Description className="text-center">
                      {t("layout.header.moreNotifications")}
                    </Description>
                  )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
