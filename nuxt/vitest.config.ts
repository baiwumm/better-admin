import { defineVitestConfig } from '@nuxt/test-utils/config'

/**
 * vitest 配置（@nuxt/test-utils）。
 * M0 仅含纯函数 / JSON 断言用例（locales 一致性），node 环境即可；
 * M2 起组件测试按需引入 nuxt 环境（defineVitestProject + environment: 'nuxt'）。
 */
export default defineVitestConfig({
  test: {
    environment: 'node'
  }
})
