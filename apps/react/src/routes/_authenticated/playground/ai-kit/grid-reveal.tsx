import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/common/placeholder-page";

/** 演示场 › Ai Kit › Grid Reveal（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/ai-kit/grid-reveal",
)({
  staticData: { titleKey: "menu.playground.gridReveal" },
  component: () => (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="grid-2x2"
      titleKey="menu.playground.gridReveal"
    />
  ),
});
