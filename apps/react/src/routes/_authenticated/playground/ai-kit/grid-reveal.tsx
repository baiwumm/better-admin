import { createFileRoute } from "@tanstack/react-router";

import { GridRevealPage } from "@/features/playground/grid-reveal/grid-reveal-page";

/** 演示场 › Ai Kit › Grid Reveal（plan-dashboard-playground.md §6）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/ai-kit/grid-reveal",
)({
  staticData: { titleKey: "menu.playground.gridReveal" },
  component: GridRevealPage,
});
