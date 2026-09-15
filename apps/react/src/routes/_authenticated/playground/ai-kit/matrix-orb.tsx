import { createFileRoute } from "@tanstack/react-router";

import { MatrixOrbPage } from "@/features/playground/matrix-orb/matrix-orb-page";

/** 演示场 › Ai Kit › Matrix Orb（plan-dashboard-playground.md §6）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/ai-kit/matrix-orb",
)({
  staticData: { titleKey: "menu.playground.matrixOrb" },
  component: MatrixOrbPage,
});
