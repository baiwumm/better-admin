import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/dicts")({
  staticData: { title: "字典管理" },
  component: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-muted">
      字典管理
    </div>
  ),
});
