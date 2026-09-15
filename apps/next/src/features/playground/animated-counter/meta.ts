import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const animatedCounterMeta: DemoMeta = {
  titleKey: "menu.playground.animatedCounter",
  descriptionKey: "features.playground.animatedCounter.description",
  scenarioKey: "features.playground.animatedCounter.scenario",
  packages: [
    {
      name: "motion",
      version: packageVersion("motion"),
      github: "https://github.com/motiondivision/motion",
      docs: "https://motion.dev/docs/react",
    },
  ],
  source: "apps/next/src/features/playground/animated-counter",
};
