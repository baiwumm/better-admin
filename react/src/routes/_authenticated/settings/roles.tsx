import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/roles")({
  staticData: { title: "角色管理" },
  component: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-muted">
      角色管理
    </div>
  ),
});
