import { AccountPage } from "@/features/account/account-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.account");

/** 我的账户页（/account）。资料/邮箱/密码/头像交互见 features/account。 */
export default function AccountSettingsPage() {
  return <AccountPage />;
}
