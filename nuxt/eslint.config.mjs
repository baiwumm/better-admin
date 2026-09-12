// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // 该规则属 eslint-plugin-vue 的 vue2-essential 规则集（Vue 3 下
      // @nuxt/eslint 生成的配置误启用）：Vue 3 fragment 语法下注释节点 /
      // slot 作模板根均合法（app/layouts/empty.vue 等），显式关闭。
      'vue/no-multiple-template-root': 'off'
    }
  }
)
