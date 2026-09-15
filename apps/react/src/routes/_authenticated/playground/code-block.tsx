import { createFileRoute } from "@tanstack/react-router";

import { CodeBlockPage } from "@/features/playground/code-block/code-block-page";

/** 演示场 › 代码块（plan-dashboard-playground.md §6）。 */
export const Route = createFileRoute("/_authenticated/playground/code-block")({
  staticData: { titleKey: "menu.playground.codeBlock" },
  component: CodeBlockPage,
});
