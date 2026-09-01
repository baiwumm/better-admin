import { UsersPage } from "@/features/users/users-page";

/**
 * 用户管理页（/settings/users）。
 * 列表/表单/权限交互见 features/users；菜单与用户数据由
 * (authenticated) layout RSC 注入 AdminShell。
 */
export default function UsersSettingsPage() {
  return <UsersPage />;
}
