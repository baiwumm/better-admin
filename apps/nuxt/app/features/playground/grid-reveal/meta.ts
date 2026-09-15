import type { DemoMeta } from '../types'

export const gridRevealMeta: DemoMeta = {
  titleKey: 'menu.playground.gridReveal',
  descriptionKey: 'features.playground.gridReveal.description',
  scenarioKey: 'features.playground.gridReveal.scenario',
  // Canvas 2D 网格拆分引擎逐字移植；说明条动画以 CSS 等效实现，零 npm 依赖
  packages: [],
  source: 'apps/nuxt/app/features/playground/grid-reveal'
}
