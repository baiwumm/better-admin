import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const okrTreeMeta: DemoMeta = {
  titleKey: "menu.playground.okrTree",
  descriptionKey: "features.playground.okrTree.description",
  scenarioKey: "features.playground.okrTree.scenario",
  packages: [
    {
      name: "react-okr-tree",
      version: packageVersion("react-okr-tree"),
      github: "https://github.com/baiwumm/react-okr-tree",
      docs: "https://react-okr-tree.baiwumm.com",
    },
  ],
  source: "apps/react/src/features/playground/okr-tree",
};
