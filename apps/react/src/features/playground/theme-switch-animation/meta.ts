import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const themeSwitchAnimationMeta: DemoMeta = {
  titleKey: "menu.playground.themeSwitchAnimation",
  descriptionKey: "features.playground.themeSwitchAnimation.description",
  scenarioKey: "features.playground.themeSwitchAnimation.scenario",
  packages: [
    {
      name: "theme-switch-animation",
      version: packageVersion("theme-switch-animation"),
      github: "https://github.com/baiwumm/theme-switch-animation",
      docs: "https://theme-switch-animation.baiwumm.com",
    },
  ],
  source: "apps/react/src/features/playground/theme-switch-animation",
};
