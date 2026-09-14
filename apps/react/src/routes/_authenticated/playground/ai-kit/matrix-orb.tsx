import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/common/placeholder-page";

/** 演示场 › Ai Kit › Matrix Orb（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/ai-kit/matrix-orb",
)({
  staticData: { titleKey: "menu.playground.matrixOrb" },
  component: () => (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="atom"
      titleKey="menu.playground.matrixOrb"
    />
  ),
});
