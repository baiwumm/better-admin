import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/common/placeholder-page";

/** 演示场 › Ai Kit › Fluid Orb（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/ai-kit/fluid-orb",
)({
  staticData: { titleKey: "menu.playground.fluidOrb" },
  component: () => (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="orbit"
      titleKey="menu.playground.fluidOrb"
    />
  ),
});
