import { defineVitestConfig } from '@nuxt/test-utils/config'

/**
 * vitest 配置（@nuxt/test-utils，对齐 Vue 端策略）：
 * environment: 'jsdom'——column-setting 等用例消费 localStorage（Vue 端
 * 全局 jsdom 同款）；globals 保持默认（用例显式 import vitest API）。
 * M2 起纯函数用例平移自 Vue（permission / list-store / column-setting /
 * password-validation / route-access / use-list-query）；组件测试按需补。
 */
export default defineVitestConfig({
  test: {
    environment: 'jsdom'
  }
})
