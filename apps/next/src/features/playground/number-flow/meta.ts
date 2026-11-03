import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const numberFlowMeta: DemoMeta = {
  titleKey: "menu.playground.numberFlow",
  descriptionKey: "features.playground.numberFlow.description",
  scenarioKey: "features.playground.numberFlow.scenario",
  // Dashboard KPI 卡数字滚动（features/dashboard/kpi-card.tsx、dashboard-page.tsx）
  usedIn: [{ labelKey: "menu.pageTitle.console", to: "/" }],
  packages: [
    {
      name: "@number-flow/react",
      version: packageVersion("@number-flow/react"),
      github: "https://github.com/barvian/number-flow",
      docs: "https://number-flow.barvian.me/",
    },
  ],
  source: "apps/next/src/features/playground/number-flow",
};
