import { createFileRoute } from "@tanstack/react-router";

import { AccountPage } from "@/features/account/account-page";

export const Route = createFileRoute("/_authenticated/account")({
  staticData: { titleKey: "menu.pageTitle.account" },
  component: AccountPage,
});
