/**
 * 应用级环境变量访问（Nuxt runtimeConfig.public）。
 *
 * useRuntimeConfig() 依赖 Nuxt 上下文，api-client 等非组件模块无法直接调用；
 * 本模块采用「plugin 启动时注入、模块级快照读取」模式（与 bindAuthSnapshot
 * 同一解耦惯例）：app/plugins/env.ts 在应用启动时调用 initEnv()。
 * 变量定义见 nuxt.config.ts runtimeConfig.public 与 .env.example（NUXT_PUBLIC_* 前缀）。
 */
interface EnvConfig {
  /** 站点名称（品牌名），如 "Better Admin" */
  appName: string
  appDesc: string
  /** 后端 API Base URL（含全局前缀 /api）；Nuxt 端为同源 Nitro server routes */
  apiBaseUrl: string
}

const config: EnvConfig = {
  appName: 'Better Admin',
  appDesc: '一个探索多技术栈全栈开发的 Admin 项目。',
  apiBaseUrl: '/api'
}

/** plugin 启动时注入 runtimeConfig.public（覆盖默认值）。 */
export function initEnv(publicConfig: Partial<EnvConfig>) {
  Object.assign(config, publicConfig)
}

export const ENV = config
