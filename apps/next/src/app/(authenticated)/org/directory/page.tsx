import { DirectoryPage as OrgDirectoryView } from "@/features/org/directory-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.directory");

/** 人员通讯录页（/org/directory）。左树筛选/服务端分页见 features/org。 */
export default function OrgDirectoryPage() {
  return <OrgDirectoryView />;
}
