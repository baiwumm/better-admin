import { UsersPage } from "@/features/users/users-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.users");

/**
 * 用户管理页（/settings/users）。
 * 列表/表单/权限交互见 features/users；菜单与用户数据由
 * (authenticated) layout RSC 注入 AdminShell。
 */
export default function UsersSettingsPage() {
  return <UsersPage />;
}
