import { bindAuthToApiClient } from '@/stores/auth-store'

/**
 * auth-store 与 api-client 解耦绑定（读取 token 的唯一通道）；
 * 对齐 Vue 端 main.ts 启动时的 bindAuthToApiClient() 调用。
 */
export default defineNuxtPlugin(() => {
  bindAuthToApiClient()
})
