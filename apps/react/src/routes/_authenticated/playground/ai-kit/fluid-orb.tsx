import { createFileRoute } from "@tanstack/react-router";

import { FluidOrbPage } from "@/features/playground/fluid-orb/fluid-orb-page";

/** 演示场 › Ai Kit › Fluid Orb（plan-dashboard-playground.md §6）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/ai-kit/fluid-orb",
)({
  staticData: { titleKey: "menu.playground.fluidOrb" },
  component: FluidOrbPage,
});
