import { createFileRoute } from "@tanstack/react-router";

import { GitHubActivityPage } from "@/features/playground/github-activity/github-activity-page";

/** 演示场 › GitHub Activity（plan-dashboard-playground.md §6）。 */
export const Route = createFileRoute(
  "/_authenticated/playground/github-activity",
)({
  staticData: { titleKey: "menu.playground.githubActivity" },
  component: GitHubActivityPage,
});
