import type { DirectoryEntry, Role } from "@/lib/api-types";

import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Description,
  Drawer,
  Spinner,
  Typography,
  type UseOverlayStateReturn,
} from "@heroui/react";
import { keepPreviousData } from "@tanstack/react-query";

import { fetchRoleUsers } from "./role-api";

import { useTranslation } from "@/i18n";

/**
 * 角色关联用户抽屉（关联用户穿透，契约 v1.13.0 GET /roles/:id/users）：
 * 点击角色列表「关联用户」列的 +N 时打开，一次拉取前 50 名关联用户展示
 * （名单总量见顶部 count；过滤口径与岗位在职人员穿透一致——未删除且非离职）。
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

  const membersQuery = useQuery({
    queryKey: ["roles", "users", role?.id ?? ""],
    queryFn: () => fetchRoleUsers(role!.id, 1, 50),
    enabled: Boolean(role) && state.isOpen,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const members = membersQuery.data?.data ?? [];

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-[420px] max-w-full">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="min-w-0 truncate font-bold">
                {role
                  ? t("features.roles.members.title", { name: role.name })
                  : t("features.roles.members.titleFallback")}
              </Drawer.Heading>
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
                <div className="flex flex-col gap-2">
                  <Typography color="muted" type="body-xs">
                    {t("features.roles.members.count", {
                      count:
                        membersQuery.data?.pagination.total ?? members.length,
                    })}
                  </Typography>
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
                </div>
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
