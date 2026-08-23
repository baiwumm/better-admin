import {
  Avatar,
  cn,
  Dropdown,
  Label,
  Separator,
  Typography,
} from "@heroui/react";
import { Bell, ChevronsUpDown, LogOut, Settings, UserCog } from "lucide-react";

type SidebarUserProps = {
  collapsed?: boolean;
};

const mockUser = {
  name: "管理员",
  email: "admin@better-admin.local",
  avatar: "",
};

/**
 * 侧边栏底部用户区：头像 + 名称/邮箱（折叠态仅显示头像）。
 * 使用 Hero UI Dropdown 实现用户菜单（对齐 react-shadcn 的 NavUser 交互）。
 * 菜单项的跳转 / 退出登录等动作逻辑暂未接入，后续在 Navigation 模块补齐。
 */
export function SidebarUser({ collapsed }: SidebarUserProps) {
  const initials = mockUser.name.slice(0, 1);

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
            <Avatar.Image alt={mockUser.name} src={mockUser.avatar} />
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <Typography
                  className="truncate leading-tight font-semibold"
                  type="body-sm"
                >
                  {mockUser.name}
                </Typography>
                <Typography
                  className="truncate leading-tight"
                  color="muted"
                  type="body-xs"
                >
                  {mockUser.email}
                </Typography>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted" />
            </>
          )}
        </Dropdown.Trigger>

        <Dropdown.Popover className="min-w-56" placement="end bottom">
          {/* 弹层头部：用户信息 */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <Avatar.Image alt={mockUser.name} src={mockUser.avatar} />
                <Avatar.Fallback className="bg-default text-foreground">
                  {initials}
                </Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-snug">
                <Typography
                  className="truncate leading-snug font-medium"
                  type="body-sm"
                >
                  {mockUser.name}
                </Typography>
                <Typography
                  className="truncate leading-snug"
                  color="muted"
                  type="body-xs"
                >
                  {mockUser.email}
                </Typography>
              </div>
            </div>
          </div>

          <Dropdown.Menu>
            <Dropdown.Item id="profile" textValue="个人资料">
              <UserCog className="size-4 shrink-0 text-muted" />
              <Label>个人资料</Label>
            </Dropdown.Item>
            <Dropdown.Item id="account" textValue="账户">
              <Settings className="size-4 shrink-0 text-muted" />
              <Label>账户</Label>
            </Dropdown.Item>
            <Dropdown.Item id="notifications" textValue="通知">
              <Bell className="size-4 shrink-0 text-muted" />
              <Label>通知</Label>
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
