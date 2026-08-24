import type { Key } from "react";

import { useState } from "react";
import {
  AlertDialog,
  Avatar,
  Button,
  cn,
  Dropdown,
  Label,
  Separator,
  Spinner,
  Typography,
  toast,
  useOverlayState,
} from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, IdCard } from "lucide-react";

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
 * - 我的账户 → 跳转 /account
 * - 退出登录 → 弹 AlertDialog 二次确认，确认后调用后端 /auth/logout，
 *   成功才清本地会话并跳登录页；失败则 toast 错误提示、不退出。
 */
export function SidebarUser({ collapsed }: SidebarUserProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // 退出二次确认弹窗状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop）
  const exitDialog = useOverlayState();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = user?.displayName ?? fallbackUser.name;
  const email = user?.username ?? fallbackUser.email;
  const initials = displayName.slice(0, 1);

  const handleAction = (key: Key) => {
    switch (key) {
      case "account":
        void navigate({ to: "/account" });
        break;
      case "logout":
        // 先弹出二次确认对话框，不直接退出
        exitDialog.open();
        break;
      default:
        break;
    }
  };

  /** 确认退出：调后端 logout，成功后清会话并跳登录页；失败仅提示、保持登录。 */
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // 本地会话已清（无论后端成败），提示成功并跳登录页。
      toast.success("已退出登录");
      exitDialog.close();
      void navigate({ to: "/sign-in" });
    } catch (error) {
      // 仅网络层等真实异常才会到这（后端 401/过期已在 logout 内按失效处理）；
      // 提示用户但不退出、保持登录态。
      toast.danger(
        error instanceof Error ? error.message : "退出失败，请稍后重试",
      );
      exitDialog.close();
    } finally {
      setIsLoggingOut(false);
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

      {/* 退出二次确认对话框（Hero UI 官方用法：open 状态挂 Backdrop） */}
      <AlertDialog.Backdrop
        isOpen={exitDialog.isOpen}
        onOpenChange={exitDialog.setOpen}
      >
        <AlertDialog.Container placement="center">
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>确认退出登录？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              退出后需要重新登录才能访问控制台。确定要退出当前账号吗？
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isLoggingOut}
                variant="ghost"
                onPress={exitDialog.close}
              >
                取消
              </Button>
              <Button
                isPending={isLoggingOut}
                variant="danger"
                onPress={handleConfirmLogout}
              >
                {({ isPending }) =>
                  isPending ? (
                    <>
                      <Spinner color="current" size="sm" />
                      退出中…
                    </>
                  ) : (
                    "确认退出"
                  )
                }
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}