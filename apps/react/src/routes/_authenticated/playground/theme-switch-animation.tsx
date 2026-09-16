import { createFileRoute } from "@tanstack/react-router";

import { ThemeSwitchAnimationPage } from "@/features/playground/theme-switch-animation/theme-switch-animation-page";

/** 演示场 › 主题切换动画（theme-switch-animation，View Transitions API 蒙版揭示）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/theme-switch-animation",
)({
  staticData: { titleKey: "menu.playground.themeSwitchAnimation" },
  component: ThemeSwitchAnimationPage,
});
