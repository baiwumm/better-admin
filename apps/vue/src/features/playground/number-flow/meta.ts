import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const numberFlowMeta: DemoMeta = {
  titleKey: "menu.playground.numberFlow",
  descriptionKey: "features.playground.numberFlow.description",
  scenarioKey: "features.playground.numberFlow.scenario",
  // Dashboard KPI 卡数字滚动（features/dashboard/KpiCard.vue、DashboardPage.vue）
  usedIn: [{ labelKey: "menu.pageTitle.console", to: "/" }],
  packages: [
    {
      name: "@number-flow/vue",
      version: packageVersion("@number-flow/vue"),
      github: "https://github.com/barvian/number-flow",
      docs: "https://number-flow.barvian.me/vue",
    },
  ],
  source: "apps/vue/src/features/playground/number-flow",
};
