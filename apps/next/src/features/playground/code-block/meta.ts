import type { DemoMeta } from "../types";

import { packageVersion } from "../constants";

export const codeBlockMeta: DemoMeta = {
  titleKey: "menu.playground.codeBlock",
  descriptionKey: "features.playground.codeBlock.description",
  scenarioKey: "features.playground.codeBlock.scenario",
  packages: [
    {
      name: "prism-react-renderer",
      version: packageVersion("prism-react-renderer"),
      github: "https://github.com/FormidableLabs/prism-react-renderer",
      docs: "https://github.com/FormidableLabs/prism-react-renderer#readme",
    },
    {
      name: "motion",
      version: packageVersion("motion"),
      github: "https://github.com/motiondivision/motion",
      docs: "https://motion.dev/docs/react",
    },
  ],
  source: "apps/next/src/features/playground/code-block",
};
