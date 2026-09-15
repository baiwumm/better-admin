import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  type Ref
} from 'vue'

/**
 * 演示组件的「运行中」信号：挂载 / KeepAlive 激活时为 true，停用 / 卸载时为 false。
 * 各演示页的定时器 / RAF 以 `watch(active, …, { immediate: true })` + `onCleanup` 挂接，
 * 多标签保活切走即停摆、切回重启（对齐 React 端 effect + `<Activity>` 语义；
 * plan-dashboard-playground.md §6「动画组件在 keepAlive 后台须暂停」）。
 * KeepAlive 内首次挂载 mounted 与 activated 会连续触发，置 true 幂等。
 */
export function useDemoActive(): Ref<boolean> {
  const active = ref(false)

  onMounted(() => {
    active.value = true
  })
  onActivated(() => {
    active.value = true
  })
  onDeactivated(() => {
    active.value = false
  })
  onBeforeUnmount(() => {
    active.value = false
  })

  return active
}
