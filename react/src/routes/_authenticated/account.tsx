import { createFileRoute } from "@tanstack/react-router";

import { AccountPage } from "@/features/account/account-page";

export const Route = createFileRoute("/_authenticated/account")({
  // icon 与用户下拉菜单「我的账户」入口一致（IdCard）
  staticData: { titleKey: "menu.pageTitle.account", icon: "id-card" },
  component: AccountPage,
});
