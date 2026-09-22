import type { DemoMeta } from '../types'

import { packageVersion } from '../constants'

export const okrTreeMeta: DemoMeta = {
  titleKey: 'menu.playground.okrTree',
  descriptionKey: 'features.playground.okrTree.description',
  scenarioKey: 'features.playground.okrTree.scenario',
  packages: [
    {
      name: 'vue3-okr-tree',
      version: packageVersion('vue3-okr-tree'),
      github: 'https://github.com/baiwumm/vue3-okr-tree',
      docs: 'https://vue3-okr-tree.baiwumm.com'
    }
  ],
  source: 'apps/nuxt/app/features/playground/okr-tree'
}
