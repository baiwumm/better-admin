import type { DemoMeta } from '../types'

import { packageVersion } from '../constants'

export const numberFlowMeta: DemoMeta = {
  titleKey: 'menu.playground.numberFlow',
  descriptionKey: 'features.playground.numberFlow.description',
  scenarioKey: 'features.playground.numberFlow.scenario',
  // Phase C Dashboard KPI 数字滚动落地后回填 usedIn（plan §5.2 关联区）
  packages: [
    {
      name: '@number-flow/vue',
      version: packageVersion('@number-flow/vue'),
      github: 'https://github.com/barvian/number-flow',
      docs: 'https://number-flow.barvian.me/vue'
    }
  ],
  source: 'apps/nuxt/app/features/playground/number-flow'
}
