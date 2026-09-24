import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

import { githubUrl } from "@/lib/env";

export const okrTreeMeta: DemoMeta = {
  titleKey: "menu.playground.okrTree",
  descriptionKey: "features.playground.okrTree.description",
  scenarioKey: "features.playground.okrTree.scenario",
  packages: [
    {
      name: "react-okr-tree",
      version: packageVersion("react-okr-tree"),
      github: githubUrl("react-okr-tree"),
      docs: "https://react-okr-tree.baiwumm.com",
    },
  ],
  source: "apps/react/src/features/playground/okr-tree",
};
