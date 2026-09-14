import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/common/placeholder-page";

/** 演示场 › 数字动画 › Animated Counter（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/count-to/animated-counter",
)({
  staticData: { titleKey: "menu.playground.animatedCounter" },
  component: () => (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="tally-5"
      titleKey="menu.playground.animatedCounter"
    />
  ),
});
