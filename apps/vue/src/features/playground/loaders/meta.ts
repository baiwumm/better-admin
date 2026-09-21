import type { DemoMeta } from "../types";

export const loadersMeta: DemoMeta = {
  titleKey: "menu.playground.loaders",
  descriptionKey: "features.playground.loaders.description",
  scenarioKey: "features.playground.loaders.scenario",
  // beUI `loader` 的 17 个变体逐一对应移植；React 端的 motion 关键帧在本端
  // 以 CSS @keyframes 等效（端内约定不引入 motion-v），ASCII / scramble /
  // percent 三类走 setInterval，零 npm 依赖
  packages: [],
  source: "apps/vue/src/features/playground/loaders",
};
