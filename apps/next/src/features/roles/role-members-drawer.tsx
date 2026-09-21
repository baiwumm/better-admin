"use client";

import type { DirectoryEntry, Role } from "@/lib/api-types";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Avatar,
  Description,
  Drawer,
  Pagination,
  Spinner,
  Typography,
  type UseOverlayStateReturn,
} from "@heroui/react";
import { keepPreviousData } from "@tanstack/react-query";

import { fetchRoleUsers } from "./role-api";

import { getPageItems } from "@/components/common/data-table";
import { useTranslation } from "@/i18n";

/** 名单分页大小（pageSize 全站枚举 10/20/30/40/50） */
const MEMBERS_PAGE_SIZE = 20;

/**
 * 角色关联用户抽屉（关联用户穿透，契约 v1.13.0 GET /roles/:id/users）：
 * 点击角色列表「关联用户」列的 +N 时打开，服务端分页展示关联用户
 * （过滤口径与岗位在职人员穿透一致——未删除且非离职）。
 * 总数固定在 Header、分页固定在 Footer，名单滚动时两者不随动。
 * Avatar 加 key 重建子树，规避 Radix Avatar 图片加载状态残留（AGENTS §19）。
 */
export function RoleMembersDrawer({
  state,
  role,
}: {
  state: UseOverlayStateReturn;
  role: Role | null;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  // 关闭即回到第一页：下次打开（含同一角色）都从头看名单
  useEffect(() => {
    if (!state.isOpen) setPage(1);
  }, [state.isOpen]);

  const membersQuery = useQuery({
    queryKey: ["roles", "users", role?.id ?? "", page],
    queryFn: () => fetchRoleUsers(role!.id, page, MEMBERS_PAGE_SIZE),
    enabled: Boolean(role) && state.isOpen,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const members = membersQuery.data?.data ?? [];
  const total = membersQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE));

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-105 max-w-full">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <div className="flex flex-col gap-1">
                <Drawer.Heading className="min-w-0 truncate font-bold">
                  {role
                    ? t("features.roles.members.title", { name: role.name })
                    : t("features.roles.members.titleFallback")}
                </Drawer.Heading>
                {/* 总数固定在头部：不随名单滚动（对齐 role-grant-drawer 的副标题模式） */}
                {membersQuery.isSuccess && members.length > 0 && (
                  <Typography color="muted" type="body-xs">
                    {t("features.roles.members.count", { count: total })}
                  </Typography>
                )}
              </div>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-3">
              {membersQuery.isLoading ? (
                <div className="grid place-items-center py-10">
                  <Spinner size="md" />
                </div>
              ) : membersQuery.isError ? (
                <Description>
                  {t("features.roles.members.loadFailed")}
                </Description>
              ) : members.length === 0 ? (
                <Description className="py-6 text-center">
                  {t("features.roles.members.empty")}
                </Description>
              ) : (
                // 翻页期间 keepPreviousData 持续显示旧页数据：降透明度 + 叠加
                // Spinner 给出切换反馈，新页到达后自动恢复
                <div
                  className="relative flex flex-col gap-2 transition-opacity data-[loading=true]:pointer-events-none data-[loading=true]:opacity-40"
                  data-loading={membersQuery.isPlaceholderData || undefined}
                >
                  {members.map((entry: DirectoryEntry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-3xl border border-border px-3 py-2"
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
                    </div>
                  ))}
                  {membersQuery.isPlaceholderData && (
                    <div className="absolute inset-0 grid place-items-center">
                      <Spinner />
                    </div>
                  )}
                </div>
              )}
            </Drawer.Body>
            {totalPages > 1 && (
              <Drawer.Footer>
                {/*
                  居中须压 Pagination 自身的两层未分层样式（Footer 的 justify
                  对 w-full 的 nav 无效）：nav 根 `.pagination` 的 justify-between
                  （≥sm 主轴起点）与 `.pagination__content` 的 self-start
                  （<sm 交叉轴起点，420px 抽屉命中此档）。
                */}
                <Pagination
                  aria-label={t("features.roles.members.titleFallback")}
                  className="justify-center!"
                  size="sm"
                >
                  <Pagination.Content className="self-center!">
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={page === 1}
                        onPress={() => setPage((p) => p - 1)}
                      >
                        <Pagination.PreviousIcon />
                      </Pagination.Previous>
                    </Pagination.Item>
                    {getPageItems(page, totalPages).map((item, index) =>
                      item === "ellipsis" ? (
                        <Pagination.Item key={`ellipsis-${index}`}>
                          <Pagination.Ellipsis />
                        </Pagination.Item>
                      ) : (
                        <Pagination.Item key={item}>
                          <Pagination.Link
                            isActive={item === page}
                            onPress={() => setPage(item)}
                          >
                            {item}
                          </Pagination.Link>
                        </Pagination.Item>
                      ),
                    )}
                    <Pagination.Item>
                      <Pagination.Next
                        isDisabled={page === totalPages}
                        onPress={() => setPage((p) => p + 1)}
                      >
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </Drawer.Footer>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
