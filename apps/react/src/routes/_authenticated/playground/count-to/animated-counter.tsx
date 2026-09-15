import { createFileRoute } from "@tanstack/react-router";

import { AnimatedCounterPage } from "@/features/playground/animated-counter/animated-counter-page";

/** 演示场 › 数字动画 › Animated Counter（plan-dashboard-playground.md §6）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/count-to/animated-counter",
)({
  staticData: { titleKey: "menu.playground.animatedCounter" },
  component: AnimatedCounterPage,
});
