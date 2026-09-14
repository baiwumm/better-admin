import { LogsPage } from "@/features/logs/logs-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.logs");

/** 日志管理页（/settings/logs）。列表/详情抽屉/批量删除见 features/logs。 */
export default function LogsSettingsPage() {
  return <LogsPage />;
}
