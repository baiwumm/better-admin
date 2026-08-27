import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  staticData: { title: "系统设置" },
  component: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-muted">
      系统设置
    </div>
  ),
});
