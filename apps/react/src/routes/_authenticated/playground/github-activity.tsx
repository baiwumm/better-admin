import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/common/placeholder-page";

/** 演示场 › GitHub Activity（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/github-activity",
)({
  staticData: { titleKey: "menu.playground.githubActivity" },
  component: () => (
    <PlaceholderPage
      descriptionKey="features.playground.placeholder"
      icon="calendar-days"
      titleKey="menu.playground.githubActivity"
    />
  ),
});
