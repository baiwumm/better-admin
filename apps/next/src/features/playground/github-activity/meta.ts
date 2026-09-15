import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const githubActivityMeta: DemoMeta = {
  titleKey: "menu.playground.githubActivity",
  descriptionKey: "features.playground.githubActivity.description",
  scenarioKey: "features.playground.githubActivity.scenario",
  packages: [
    {
      name: "motion",
      version: packageVersion("motion"),
      github: "https://github.com/motiondivision/motion",
      docs: "https://motion.dev/docs/react",
    },
  ],
  source: "apps/next/src/features/playground/github-activity",
};
