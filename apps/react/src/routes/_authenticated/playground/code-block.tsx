import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/common/placeholder-page";

/** 演示场 › 代码块（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export const Route = createFileRoute("/_authenticated/playground/code-block")({
  staticData: { titleKey: "menu.playground.codeBlock" },
  component: () => (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="square-code"
      titleKey="menu.playground.codeBlock"
    />
  ),
});
