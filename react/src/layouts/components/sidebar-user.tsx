import type { Key } from "react";

import {
  Avatar,
  cn,
  Dropdown,
  Label,
  Separator,
  Typography,
} from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, IdCard } from "lucide-react";

import { ROUTE_PATHS } from "@/lib/route-paths";
import { useAuthStore } from "@/stores/auth-store";

type SidebarUserProps = {
  collapsed?: boolean;
};

/** 未登录兜底展示（正常流程下登录后才进入 AdminLayout）。 */
const fallbackUser = {
  name: "未登录",
  email: "",
  avatar: "",
};

/**
 * 侧边栏底部用户区：头像 + 名称/邮箱（折叠态仅显示头像）。
 * 使用 Hero UI Dropdown 实现用户菜单：
 * - 系统设置 → 跳转 /settings
 * - 退出登录 → 清理会话并跳转登录页
 */
export function SidebarUser({ collapsed }: SidebarUserProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const displayName = user?.displayName ?? fallbackUser.name;
  const email = user?.username ?? fallbackUser.email;
  const initials = displayName.slice(0, 1);

  const handleAction = (key: Key) => {
    switch (key) {
      case "account":
        void navigate({ to: ROUTE_PATHS.account });
        break;
      case "logout":
        logout();
        void navigate({ to: ROUTE_PATHS.signIn });
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={cn(
        "border-t border-separator p-3",
        collapsed && "flex justify-center",
      )}
    >
      <Dropdown>
        {/* Dropdown.Trigger 本身就是 button 元素，内容直接放入，避免 button 嵌套 */}
        <Dropdown.Trigger
          className={cn(
            "flex w-full items-center gap-3 rounded-3xl px-3 py-2 text-start hover:bg-default",
            collapsed && "w-auto justify-center px-2",
          )}
        >
          <Avatar className="shrink-0" color="accent" size="sm" variant="soft">
            <Avatar.Image alt={displayName} src={fallbackUser.avatar} />
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <Typography
                  className="truncate leading-tight font-semibold"
                  type="body-sm"
                >
                  {displayName}
                </Typography>
                <Typography
                  className="truncate leading-tight"
                  color="muted"
                  type="body-xs"
                >
                  {email}
                </Typography>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted" />
            </>
          )}
        </Dropdown.Trigger>

        <Dropdown.Popover className="min-w-56">
          {/* 弹层头部：用户信息 */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <Avatar.Image alt={displayName} src={fallbackUser.avatar} />
                <Avatar.Fallback className="bg-default text-foreground">
                  {initials}
                </Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-snug">
                <Typography
                  className="truncate leading-snug font-medium"
                  type="body-sm"
                >
                  {displayName}
                </Typography>
                <Typography
                  className="truncate leading-snug"
                  color="muted"
                  type="body-xs"
                >
                  {email}
                </Typography>
              </div>
            </div>
          </div>

          <Separator />

          <Dropdown.Menu onAction={handleAction}>
            <Dropdown.Item id="account" textValue="我的账户">
              <IdCard className="size-4 shrink-0 text-muted" />
              <Label>我的账户</Label>
            </Dropdown.Item>

            <Separator />

            <Dropdown.Item id="logout" textValue="退出登录" variant="danger">
              <LogOut className="size-4 shrink-0 text-danger" />
              <Label>退出登录</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
