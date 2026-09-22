import { createFileRoute } from "@tanstack/react-router";

import { OkrTreePage } from "@/features/playground/okr-tree/okr-tree-page";

/** 演示场 › 组织架构树（react-okr-tree：组织架构 + OKR 根节点左右双向展开）。 */
export const Route = createFileRoute("/_authenticated/playground/okr-tree")({
  staticData: { titleKey: "menu.playground.okrTree" },
  component: OkrTreePage,
});
