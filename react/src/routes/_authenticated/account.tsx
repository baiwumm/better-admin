import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/account")({
  staticData: { titleKey: "menu.pageTitle.account" },
  component: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-muted">
      我的账户
    </div>
  ),
});
