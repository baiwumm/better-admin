import type { Key } from "react";
import type { AuthUser } from "@/lib/api-types";

import { useState } from "react";
import { useRouter } from "@bprogress/next/app";
import {
  AlertDialog,
  Avatar,
  Button,
  cn,
  Dropdown,
  Label,
  Separator,
  Spinner,
  toast,
  useOverlayState,
} from "@heroui/react";
import { BellRing, ChevronsUpDown, Globe, IdCard, Link2, LogOut } from "lucide-react";

import { GithubIcon, XIcon } from "@/lib/brand-icons";
import { UserInfo } from "@/components/common/user-info/user-info";
import { useTranslation } from "@/i18n";
import { buildProfileLinks, openExternalLink } from "@/lib/profile-links";
import { useAuthStore } from "@/stores/auth-store";

type SidebarUserProps = {
  collapsed?: boolean;
  /** 当前登录用户（authenticated layout RSC 注入；服务端权威快照） */
  user: AuthUser | null;
};

/**
 * 侧边栏底部用户区：头像 + 名称/邮箱（折叠态仅显示头像）。
 * 展开态与弹层头部统一走 UserInfo 组件展示（契约 v1.4.8 起 AuthUser 含 email，
 * 次行展示邮箱）。使用 Hero UI Dropdown 实现用户菜单：
 * - 我的账户 → 跳转 /account
 * - 退出登录 → 弹 AlertDialog 二次确认，确认后调用后端 /auth/logout，
 *   成功才清本地会话并跳登录页；失败则 toast 错误提示、不退出。
 *
 * Next 适配：user 由 authenticated layout RSC 注入（服务端权威，替代
 * React 版的 zustand persist 快照读取）；导航改用 next/navigation，
 * 登出后 router.refresh() 重取整站 RSC 数据。
 */
export function SidebarUser({ collapsed, user }: SidebarUserProps) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  // 退出二次确认弹窗状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop）
  const exitDialog = useOverlayState();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t } = useTranslation();

  const displayName = user?.displayName ?? t("layout.user.notSignedIn");
  const initials = displayName.slice(0, 1);
  // 未登录兜底（正常流程下登录后才进入 AdminLayout）
  const sidebarUser = user ?? { username: t("layout.user.notSignedIn") };
  // 个人链接（契约 v1.5.3）：三个都未填写时整个子菜单不显示
  const profileLinks = buildProfileLinks(user ?? {});

  const handleAction = (key: Key) => {
    switch (key) {
      case "account":
        router.push("/account");
        break;
      case "my-notices":
        router.push("/my-notices");
        break;
      case "logout":
        // 先弹出二次确认对话框，不直接退出
        exitDialog.open();
        break;
      default:
        break;
    }
  };

  /** 子菜单点击：新窗口打开对应链接 */
  const handleLinkAction = (key: Key) => {
    const link = profileLinks.find((item) => item.key === key);

    if (link) openExternalLink(link.url);
  };

  /** 确认退出：调后端 logout，成功后清会话并跳登录页；失败仅提示、保持登录。 */
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // 本地会话已清（无论后端成败），提示成功并跳登录页。
      toast.success(t("layout.user.signedOut"));
      exitDialog.close();
      router.push("/sign-in");
      // 会话已失效，刷新整站 RSC 数据（避免残留已登录态的服务端缓存）
      router.refresh();
    } catch (error) {
      // 仅网络层等真实异常才会到这（后端 401/过期已在 logout 内按失效处理）；
      // 提示用户但不退出、保持登录态。
      toast.danger(
        error instanceof Error ? error.message : t("layout.user.signOutFailed"),
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
          {collapsed ? (
            <Avatar
              key={user?.avatar ?? "collapsed-fallback"}
              className="shrink-0"
              color="accent"
              size="sm"
              variant="soft"
            >
              {user?.avatar ? (
                <Avatar.Image alt={displayName} src={user.avatar} />
              ) : null}
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar>
          ) : (
            <>
              <UserInfo className="min-w-0 flex-1" user={sidebarUser} />
              <ChevronsUpDown className="size-4 shrink-0 text-muted" />
            </>
          )}
        </Dropdown.Trigger>

        <Dropdown.Popover className="min-w-56">
          {/* 弹层头部：用户信息（与触发器同构，统一走 UserInfo） */}
          <div className="px-3 pt-3 pb-1">
            <UserInfo user={sidebarUser} />
          </div>

          <Separator />

          <Dropdown.Menu onAction={handleAction}>
            <Dropdown.Item id="account" textValue={t("layout.user.myAccount")}>
              <IdCard className="size-4 shrink-0 text-muted" />
              <Label>{t("layout.user.myAccount")}</Label>
            </Dropdown.Item>

            <Dropdown.Item
              id="my-notices"
              textValue={t("layout.user.myNotices")}
            >
              <BellRing className="size-4 shrink-0 text-muted" />
              <Label>{t("layout.user.myNotices")}</Label>
            </Dropdown.Item>

            {/* 个人链接子菜单：AuthUser 三个链接字段全空时整体隐藏 */}
            {profileLinks.length > 0 ? (
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item id="links" textValue={t("layout.user.myLinks")}>
                  <Link2 className="size-4 shrink-0 text-muted" />
                  <Label>{t("layout.user.myLinks")}</Label>
                  <Dropdown.SubmenuIndicator />
                </Dropdown.Item>
                <Dropdown.Popover className="min-w-44">
                  <Dropdown.Menu onAction={handleLinkAction}>
                    {profileLinks.map((link) => (
                      <Dropdown.Item
                        key={link.key}
                        id={link.key}
                        textValue={t(link.labelKey)}
                      >
                        {link.key === "website" ? (
                          <Globe className="size-4 shrink-0 text-muted" />
                        ) : link.key === "github" ? (
                          <GithubIcon className="size-4 shrink-0 text-muted" />
                        ) : (
                          <XIcon className="size-4 shrink-0 text-muted" />
                        )}
                        <Label>{t(link.labelKey)}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
            ) : null}

            <Separator />

            <Dropdown.Item
              id="logout"
              textValue={t("layout.user.signOut")}
              variant="danger"
            >
              <LogOut className="size-4 shrink-0 text-danger" />
              <Label>{t("layout.user.signOut")}</Label>
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
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>
                {t("layout.user.signOutTitle")}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{t("layout.user.signOutDesc")}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isLoggingOut}
                variant="tertiary"
                onPress={exitDialog.close}
              >
                {t("common.cancel")}
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
                      {t("layout.user.signingOut")}
                    </>
                  ) : (
                    t("layout.user.confirmSignOut")
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
