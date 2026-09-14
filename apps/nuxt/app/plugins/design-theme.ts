import { initDesignTheme, useDesignThemeStore } from '@/stores/design-theme-store'

/**
 * 偏好设置启动接线（对齐 Vue 端 main.ts 的 initDesignTheme + 常驻 store）：
 * - initDesignTheme：挂载前同步应用主题色 / 圆角 / 色彩模式滤镜 / 路由过渡
 *   到 <html>，防首帧闪默认主题（明暗 class 已由 @nuxtjs/color-mode 首帧脚本设好）；
 * - useDesignThemeStore：偏好 store 随应用生命周期常驻（Black 黑白主题需在
 *   任何页面跟随明暗切换重算，不能等偏好抽屉首次渲染才建立监听）。
 * client-only 插件：ssr:false 下全站客户端运行，plugin 于水合前执行。
 */
export default defineNuxtPlugin(() => {
  initDesignTheme()
  useDesignThemeStore()
})
