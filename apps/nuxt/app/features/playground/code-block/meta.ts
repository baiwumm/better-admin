import type { DemoMeta } from '../types'

import { packageVersion } from '../constants'

export const codeBlockMeta: DemoMeta = {
  titleKey: 'menu.playground.codeBlock',
  descriptionKey: 'features.playground.codeBlock.description',
  scenarioKey: 'features.playground.codeBlock.scenario',
  // Vue 端高亮走 prismjs 直渲染（prism-react-renderer 为 React 专属）；复制反馈动画以 CSS 等效，不引入 motion-v
  packages: [
    {
      name: 'prismjs',
      version: packageVersion('prismjs'),
      github: 'https://github.com/PrismJS/prism',
      docs: 'https://prismjs.com/'
    }
  ],
  source: 'apps/nuxt/app/features/playground/code-block'
}
