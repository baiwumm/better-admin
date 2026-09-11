import { DictsPage } from "@/features/dicts/dicts-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.dicts");

/** 字典管理页（/settings/dicts）。左类型列表/右项列表交互见 features/dicts。 */
export default function DictsSettingsPage() {
  return <DictsPage />;
}
