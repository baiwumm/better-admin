import type { DemoMeta } from '../types'

export const animatedCounterMeta: DemoMeta = {
  titleKey: 'menu.playground.animatedCounter',
  descriptionKey: 'features.playground.animatedCounter.description',
  scenarioKey: 'features.playground.animatedCounter.scenario',
  // 滚轮 / 位移动画以 CSS transition + Vue TransitionGroup（FLIP）等效实现，零 npm 依赖
  packages: [],
  source: 'apps/nuxt/app/features/playground/animated-counter'
}
