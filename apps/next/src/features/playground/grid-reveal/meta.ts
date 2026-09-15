import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const gridRevealMeta: DemoMeta = {
  titleKey: "menu.playground.gridReveal",
  descriptionKey: "features.playground.gridReveal.description",
  scenarioKey: "features.playground.gridReveal.scenario",
  packages: [
    {
      name: "motion",
      version: packageVersion("motion"),
      github: "https://github.com/motiondivision/motion",
      docs: "https://motion.dev/docs/react",
    },
  ],
  source: "apps/next/src/features/playground/grid-reveal",
};
