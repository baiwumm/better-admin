import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const loadersMeta: DemoMeta = {
  titleKey: "menu.playground.loaders",
  descriptionKey: "features.playground.loaders.description",
  scenarioKey: "features.playground.loaders.scenario",
  packages: [
    {
      name: "motion",
      version: packageVersion("motion"),
      github: "https://github.com/motiondivision/motion",
      docs: "https://motion.dev/docs/react",
    },
  ],
  source: "apps/react/src/features/playground/loaders",
};
