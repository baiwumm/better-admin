import { createFileRoute } from "@tanstack/react-router";

import { LoadersPage } from "@/features/playground/loaders/loaders-page";

/** 演示场 › 加载动画（beUI loader，单组件 17 种加载动效变体）。 */
export const Route = createFileRoute("/_authenticated/playground/loaders")({
  staticData: { titleKey: "menu.playground.loaders" },
  component: LoadersPage,
});
