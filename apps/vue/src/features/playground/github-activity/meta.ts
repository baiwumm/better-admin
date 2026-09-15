import type { DemoMeta } from "../types";

export const githubActivityMeta: DemoMeta = {
  titleKey: "menu.playground.githubActivity",
  descriptionKey: "features.playground.githubActivity.description",
  scenarioKey: "features.playground.githubActivity.scenario",
  // 热力图入场 / 面板展开动画以 CSS 等效实现，零 npm 依赖
  packages: [],
  source: "apps/vue/src/features/playground/github-activity",
};
