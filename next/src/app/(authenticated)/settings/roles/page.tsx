import { RolesPage } from "@/features/roles/roles-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.roles");

/** 角色管理页（/settings/roles）。列表/授权抽屉交互见 features/roles。 */
export default function RolesSettingsPage() {
  return <RolesPage />;
}
