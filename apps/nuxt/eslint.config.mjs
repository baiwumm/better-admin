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
  },
  {
    // vendor 组件保真的单点开销：演示场 `loaders` 页的 `Loader.vue` 直译自 beUI
    // registry 的 `loader`，且 React / Next / Vue 三端同名 `Loader`——四端文件命名
    // 一致优先（AGENTS §7.4），故仅对该文件关闭 vue/multi-word-component-names。
    files: ['app/features/playground/loaders/Loader.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
)
