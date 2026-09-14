// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@vueuse/nuxt'
  ],

  // 渲染模式（nuxt-plan.md §5 D1 决策）：SPA 模式——与 Vue / React 行为完全一致，
  // localStorage 持久化 store、useColorMode、守卫走客户端 route middleware；
  // Nitro 仍提供全部 server API（/api/**）。
  ssr: false,

  // 组件自动导入不带目录前缀（app/components/layout/UserMenu.vue → <UserMenu />），
  // 与 Vue 端模板写法一致；现有组件文件名均唯一，无冲突
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // 主题三态（nuxt-plan.md §4）：@nuxt/ui 内置集成 @nuxtjs/color-mode，
  // 默认 preference: 'system' + fallback: 'light' + class 策略（classSuffix 由
  // Nuxt UI 置空），防闪烁脚本由模块接管。system / light / dark 对齐 Vue 端 auto/light/dark。
  colorMode: {},

  // ── 公开环境变量（浏览器可见，必须带 NUXT_PUBLIC_ 前缀）──
  // 服务端密钥（DATABASE_URL / JWT_SECRET 等）不进 runtimeConfig，
  // 由 server/ 代码直接读 process.env（与 Next / Nest 端变量命名一致，见 .env.example）。
  runtimeConfig: {
    public: {
      appName: 'Better Admin',
      appDesc: '一个探索多技术栈全栈开发的 Admin 项目。',
      apiBaseUrl: '/api'
    }
  },

  compatibilityDate: '2026-06-30',

  // 关闭 noUncheckedIndexedAccess（对 app / server / shared 全部生成的
  // tsconfig 生效）：Next / Vue 端 tsconfig 均未开启该选项，M1 服务端约
  // 6,400 行逐字平移代码（`const [row] = await db.select()` 模式）在开启时
  // 产生 30+ 处误报。保持蓝本 diff 最小与三端严格度一致（非 any 绕过）。
  typescript: {
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false
      }
    }
  },

  // server 侧 tsconfig 覆盖：Nuxt 4 默认开启的索引访问严格检查（
  // noUncheckedIndexedAccess），Next / Vue 端 tsconfig 均未开启——M1 服务端
  // 约 6,400 行逐字平移代码（`const [row] = await db.select()` 模式）在该
  // 选项下产生 30+ 处误报。经 nitro hook 关闭（typescript.tsConfig 顶层选项
  // 无法触达 nitro 生成的 server tsconfig），保持蓝本 diff 最小与三端严格度
  // 一致（非 any 绕过，仅索引检查策略对齐）。
  hooks: {
    'nitro:config'(nitroConfig) {
      nitroConfig.typescript ||= {}
      nitroConfig.typescript.tsConfig ||= {}
      nitroConfig.typescript.tsConfig.compilerOptions ||= {}
      nitroConfig.typescript.tsConfig.compilerOptions.noUncheckedIndexedAccess
        = false
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // i18n（nuxt-plan.md §5 D3 决策）：@nuxtjs/i18n v10，no_prefix 无前缀路由
  // （行为与三端一致）+ 扁平键 messageResolver（见 i18n/vue-i18n.config.ts，
  // 语言包经该配置显式导入并做插值归一化）。detectBrowserLanguage 关闭：
  // 语言偏好由 language-store 以 localStorage 管理
  // （key: better-admin:language，与三端共享），默认 zh-CN。
  i18n: {
    defaultLocale: 'zh-CN',
    locales: [
      { code: 'zh-CN', language: 'zh-CN', name: '简体中文' },
      { code: 'en', language: 'en', name: 'English' }
    ],
    strategy: 'no_prefix',
    // 路径相对于 restructureDir（<rootDir>/i18n）
    vueI18n: 'vue-i18n.config.ts',
    detectBrowserLanguage: false
  },

  // 图标（nuxt-plan.md §4）：本地 collection 整包打进 server bundle（lucide / logos，
  // 覆盖 DB 动态菜单图标名），静态用法的图标经 scan 进客户端 bundle；
  // 禁止回退 Iconify CDN——SPA 模式运行时零外部网络依赖。
  icon: {
    serverBundle: {
      collections: ['lucide', 'logos']
    },
    clientBundle: {
      scan: true
    },
    fallbackToApi: false
  }
})
