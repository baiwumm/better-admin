import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  staticData: { title: "控制台" },
  component: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-muted">
      仪表盘
    </div>
  ),
});
