/**
 * @nuxt/icon 的可选 client bundle 在纯 Vue（非 Nuxt）环境下不存在，
 * 此 shim 提供空初始化（图标走 @iconify/vue 运行时加载已安装的
 * @iconify-json/lucide 本地集合）。
 */
export function init() {
  /* no-op：未启用本地 bundle 聚合 */
}
