import { initEnv } from '@/lib/env'

/**
 * 应用级公开环境变量注入（app/lib/env.ts 快照）。
 * 服务端密钥不在此处理——server/ 代码直接读 process.env。
 */
export default defineNuxtPlugin(() => {
  const env = useRuntimeConfig().public

  initEnv({
    appName: env.appName,
    appDesc: env.appDesc,
    apiBaseUrl: env.apiBaseUrl
  })
})
