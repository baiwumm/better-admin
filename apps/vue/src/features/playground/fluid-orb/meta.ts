import type { DemoMeta } from "../types";

export const fluidOrbMeta: DemoMeta = {
  titleKey: "menu.playground.fluidOrb",
  descriptionKey: "features.playground.fluidOrb.description",
  scenarioKey: "features.playground.fluidOrb.scenario",
  // 原生 WebGL 着色器实现，零 npm 依赖
  packages: [],
  source: "apps/vue/src/features/playground/fluid-orb",
};
