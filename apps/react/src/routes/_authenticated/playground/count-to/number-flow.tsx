import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/common/placeholder-page";

/** 演示场 › 数字动画 › Number Flow（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/count-to/number-flow",
)({
  staticData: { titleKey: "menu.playground.numberFlow" },
  component: () => (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="arrow-up-1-0"
      titleKey="menu.playground.numberFlow"
    />
  ),
});
