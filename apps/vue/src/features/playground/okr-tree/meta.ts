import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

import { githubUrl } from "@/lib/env";

export const okrTreeMeta: DemoMeta = {
  titleKey: "menu.playground.okrTree",
  descriptionKey: "features.playground.okrTree.description",
  scenarioKey: "features.playground.okrTree.scenario",
  packages: [
    {
      name: "vue3-okr-tree",
      version: packageVersion("vue3-okr-tree"),
      github: githubUrl("vue3-okr-tree"),
      docs: "https://vue3-okr-tree.baiwumm.com",
    },
  ],
  source: "apps/vue/src/features/playground/okr-tree",
};
