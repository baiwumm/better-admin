import { createFileRoute } from "@tanstack/react-router";

import { NumberFlowPage } from "@/features/playground/number-flow/number-flow-page";

/** 演示场 › 数字动画 › Number Flow（plan-dashboard-playground.md §6）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/count-to/number-flow",
)({
  staticData: { titleKey: "menu.playground.numberFlow" },
  component: NumberFlowPage,
});
