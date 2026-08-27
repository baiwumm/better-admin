import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "@/features/users/users-page";

export const Route = createFileRoute("/_authenticated/settings/users")({
  staticData: { title: "用户管理" },
  component: UsersPage,
});
