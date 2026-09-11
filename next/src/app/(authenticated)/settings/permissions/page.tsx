import { PermissionsPage } from "@/features/permissions/permissions-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.permissions");

/** 权限说明页（/settings/permissions）。只读展示权限点位定义。 */
export default function PermissionsSettingsPage() {
  return <PermissionsPage />;
}
