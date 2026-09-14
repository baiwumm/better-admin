import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import {
  applyColorVisionToDOM,
  type ColorVisionMode,
  isColorVisionMode
} from '@/themes/color-vision'
import {
  applyPrimaryColorToDOM,
  DEFAULT_PRIMARY_COLOR,
  isPrimaryColor,
  PRIMARY_COLORS
} from '@/themes/primary-colors'
import {
  applyRadiusToDOM,
  DEFAULT_RADIUS_ID,
  isRadiusId,
  type RadiusId
} from '@/themes/radius'
import {
  applyRouteTransitionSpeedToDOM,
  applyRouteTransitionToDOM,
  isRouteTransition,
  isRouteTransitionSpeed,
  type RouteTransitionId,
  type RouteTransitionSpeedId
} from '@/themes/route-transitions'
import {
  isTransitionDirection,
  runViewTransition,
  type TransitionDirection
} from '@/themes/transition-direction'

/**
 * 偏好设置 store（对齐 React / Vue 端 design-theme-store，Nuxt 机制适配）：
 * 单一真源 + localStorage 逐项持久化 + DOM 应用；主题色 / 主题模式 / 色彩模式
 * 切换带方向揭示动画（runViewTransition），其余项即时生效。
 *
 * 与 Vue 端的唯一机制差异：明暗模式真源由 @vueuse/core useColorMode 换为
 * @nuxtjs/color-mode（@nuxt/ui 内置集成，nuxt-plan §4 选型）——
 * - 偏好读写：vueuse `colorMode.value`（auto|light|dark）→ `colorMode.preference`
 *   （system|light|dark，取值语义与 ThemeMode 一致，无需 auto 映射）；
 * - 实际明暗：vueuse `colorMode.state` → `colorMode.value`（只读 resolved）；
 * - 系统偏好：vueuse `colorMode.system` → matchMedia 实时查询（仅重置路径消费）。
 * 防闪烁 class 由 @nuxtjs/color-mode 模块接管（nuxt.config colorMode: {}）。
 */

const PRIMARY_COLOR_KEY = 'better-admin-primary-color'
const BLACK_AS_PRIMARY_KEY = 'better-admin-black-as-primary'
const RADIUS_KEY = 'better-admin-radius'
const COLOR_VISION_KEY = 'better-admin-color-vision'
const DIRECTION_KEY = 'better-admin-transition-direction'
const ROUTE_TRANSITION_KEY = 'better-admin-route-transition'
const ROUTE_TRANSITION_SPEED_KEY = 'better-admin-route-transition-speed'
const SHOW_TABS_KEY = 'better-admin-show-tabs'

/** 主题模式：跟随系统 / 浅色 / 深色（与 @nuxtjs/color-mode preference 同域） */
export type ThemeMode = 'system' | 'light' | 'dark'

/** 偏好设置初始状态（重置按钮的目标状态；store 初始回退值与 reset 共用此单一来源） */
export const DEFAULT_PREFERENCES = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  blackAsPrimary: false,
  radius: DEFAULT_RADIUS_ID,
  colorVision: 'normal' as ColorVisionMode,
  transitionDirection: 'ltr' as TransitionDirection,
  routeTransition: 'glide' as RouteTransitionId,
  routeTransitionSpeed: 'normal' as RouteTransitionSpeedId,
  showTabs: true,
  themeMode: 'system' as ThemeMode
} as const

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 存储不可用时偏好仅会话内生效
  }
}

interface StoredPreferences {
  primaryColor: string
  blackAsPrimary: boolean
  radius: RadiusId
  colorVision: ColorVisionMode
  transitionDirection: TransitionDirection
  routeTransition: RouteTransitionId
  routeTransitionSpeed: RouteTransitionSpeedId
  showTabs: boolean
}

/** 从 localStorage 读取全部偏好（逐项校验，非法值回退默认；主题模式由 color-mode 模块自管）。 */
function readStoredPreferences(): StoredPreferences {
  const primaryColor = readStorage(PRIMARY_COLOR_KEY)
  const radius = readStorage(RADIUS_KEY)
  const colorVision = readStorage(COLOR_VISION_KEY)
  const direction = readStorage(DIRECTION_KEY)
  const routeTransition = readStorage(ROUTE_TRANSITION_KEY)
  const speed = readStorage(ROUTE_TRANSITION_SPEED_KEY)

  return {
    primaryColor: isPrimaryColor(primaryColor)
      ? primaryColor
      : DEFAULT_PREFERENCES.primaryColor,
    blackAsPrimary: readStorage(BLACK_AS_PRIMARY_KEY) === '1',
    radius: isRadiusId(radius) ? radius : DEFAULT_PREFERENCES.radius,
    colorVision: isColorVisionMode(colorVision)
      ? colorVision
      : DEFAULT_PREFERENCES.colorVision,
    transitionDirection: isTransitionDirection(direction)
      ? direction
      : DEFAULT_PREFERENCES.transitionDirection,
    routeTransition: isRouteTransition(routeTransition)
      ? routeTransition
      : DEFAULT_PREFERENCES.routeTransition,
    routeTransitionSpeed: isRouteTransitionSpeed(speed)
      ? speed
      : DEFAULT_PREFERENCES.routeTransitionSpeed,
    showTabs: readStorage(SHOW_TABS_KEY) !== '0'
  }
}

/** 系统偏好是否为暗色（@nuxtjs/color-mode 无 system ref，实时查询媒体特性）。 */
function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 启动时同步应用全部偏好到 DOM（在应用挂载前调用，防首帧闪默认主题；
 * Nuxt 端经 client plugin 调用，先于水合渲染）。
 * 明暗 class 由 @nuxtjs/color-mode 首帧内联脚本设好，此处据此决定 Black 档取值；
 * 主题模式本身由 color-mode 模块接管。
 */
export function initDesignTheme(): void {
  if (typeof document === 'undefined') return

  const prefs = readStoredPreferences()
  const isDark = document.documentElement.classList.contains('dark')

  applyPrimaryColorToDOM(prefs.primaryColor, prefs.blackAsPrimary, isDark)
  applyRadiusToDOM(prefs.radius)
  applyColorVisionToDOM(prefs.colorVision)
  applyRouteTransitionToDOM(prefs.routeTransition)
  applyRouteTransitionSpeedToDOM(prefs.routeTransitionSpeed)
}

export const useDesignThemeStore = defineStore('design-theme', () => {
  // @nuxtjs/color-mode 实例：preference 原样暴露 system / light / dark
  const colorMode = useColorMode()

  const stored = readStoredPreferences()

  const primaryColor = ref<string>(stored.primaryColor)
  const blackAsPrimary = ref<boolean>(stored.blackAsPrimary)
  const radius = ref<RadiusId>(stored.radius)
  const colorVision = ref<ColorVisionMode>(stored.colorVision)
  const transitionDirection = ref<TransitionDirection>(
    stored.transitionDirection
  )
  const routeTransition = ref<RouteTransitionId>(stored.routeTransition)
  const routeTransitionSpeed = ref<RouteTransitionSpeedId>(
    stored.routeTransitionSpeed
  )
  const showTabs = ref<boolean>(stored.showTabs)

  /** 当前实际生效的明暗（themeMode 为 system 时模块已按系统偏好解析） */
  const isDark = computed(() => colorMode.value === 'dark')
  /** 主题模式意图（system / light / dark），镜像自 color-mode 存储 */
  const themeMode = computed<ThemeMode>(
    () => (colorMode.preference as ThemeMode) ?? 'system'
  )

  // Black 档随明暗切换重算（black ↔ white）
  watch(isDark, (dark) => {
    if (blackAsPrimary.value) {
      applyPrimaryColorToDOM(primaryColor.value, true, dark)
    }
  })

  function setPrimaryColor(color: string): void {
    const validColor = isPrimaryColor(color) ? color : DEFAULT_PRIMARY_COLOR

    if (validColor === primaryColor.value && !blackAsPrimary.value) return

    void runViewTransition(() => {
      primaryColor.value = validColor
      blackAsPrimary.value = false
      applyPrimaryColorToDOM(validColor, false, isDark.value)
      writeStorage(PRIMARY_COLOR_KEY, validColor)
      writeStorage(BLACK_AS_PRIMARY_KEY, '0')
    }, transitionDirection.value)
  }

  /** 启用 Black 黑白主题（与色板互斥；色板值保留，便于取消后回到原色） */
  function setBlackAsPrimary(): void {
    if (blackAsPrimary.value) return

    void runViewTransition(() => {
      blackAsPrimary.value = true
      applyPrimaryColorToDOM(primaryColor.value, true, isDark.value)
      writeStorage(BLACK_AS_PRIMARY_KEY, '1')
    }, transitionDirection.value)
  }

  /** 随机换色：候选排除当前激活项（Black 激活时全部色板均为候选） */
  function shufflePrimaryColor(): void {
    const candidates = blackAsPrimary.value
      ? PRIMARY_COLORS
      : PRIMARY_COLORS.filter(c => c !== primaryColor.value)

    if (candidates.length === 0) return

    const pick = candidates[Math.floor(Math.random() * candidates.length)]

    setPrimaryColor(pick)
  }

  function setRadius(id: RadiusId): void {
    const validRadius = isRadiusId(id) ? id : DEFAULT_RADIUS_ID

    radius.value = validRadius
    applyRadiusToDOM(validRadius)
    writeStorage(RADIUS_KEY, validRadius)
  }

  function setColorVision(mode: ColorVisionMode): void {
    const validMode = isColorVisionMode(mode) ? mode : 'normal'

    if (validMode === colorVision.value) return

    // 与主题色 / 主题模式一致：跟随动画方向做一次全页揭示动画
    void runViewTransition(() => {
      colorVision.value = validMode
      applyColorVisionToDOM(validMode)
      writeStorage(COLOR_VISION_KEY, validMode)
    }, transitionDirection.value)
  }

  function setTransitionDirection(direction: TransitionDirection): void {
    const validDirection = isTransitionDirection(direction) ? direction : 'ltr'

    transitionDirection.value = validDirection
    writeStorage(DIRECTION_KEY, validDirection)
  }

  function setRouteTransition(id: RouteTransitionId): void {
    const validId = isRouteTransition(id) ? id : 'none'

    routeTransition.value = validId
    applyRouteTransitionToDOM(validId)
    writeStorage(ROUTE_TRANSITION_KEY, validId)
  }

  function setRouteTransitionSpeed(speed: RouteTransitionSpeedId): void {
    const validSpeed = isRouteTransitionSpeed(speed) ? speed : 'normal'

    routeTransitionSpeed.value = validSpeed
    applyRouteTransitionSpeedToDOM(validSpeed)
    writeStorage(ROUTE_TRANSITION_SPEED_KEY, validSpeed)
  }

  function setShowTabs(show: boolean): void {
    showTabs.value = show
    writeStorage(SHOW_TABS_KEY, show ? '1' : '0')
  }

  /**
   * 设置主题模式：写 color-mode preference（其 watcher 更新 <html> class，
   * runViewTransition 内的 nextTick 会等到该更新）；实际明暗不变时仅记录意图、无动画。
   */
  function setThemeMode(mode: ThemeMode): void {
    const validMode: ThemeMode
      = mode === 'light' || mode === 'dark' || mode === 'system'
        ? mode
        : 'system'

    if (validMode === themeMode.value) return

    const targetResolved
      = validMode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : validMode
    const currentResolved = isDark.value ? 'dark' : 'light'

    if (targetResolved === currentResolved) {
      colorMode.preference = validMode

      return
    }

    void runViewTransition(() => {
      colorMode.preference = validMode
    }, transitionDirection.value)
  }

  /**
   * 一键恢复全部偏好为初始状态（state + DOM + localStorage，带一次揭示动画）。
   * Promise 在揭示动画完全结束后 resolve（调用方据此错峰弹成功 toast）。
   */
  async function resetPreferences(): Promise<void> {
    // 取重置前的方向用于本次揭示动画（方向本身也会被重置为 ltr）
    const direction = transitionDirection.value

    await runViewTransition(() => {
      primaryColor.value = DEFAULT_PREFERENCES.primaryColor
      blackAsPrimary.value = DEFAULT_PREFERENCES.blackAsPrimary
      radius.value = DEFAULT_PREFERENCES.radius
      colorVision.value = DEFAULT_PREFERENCES.colorVision
      transitionDirection.value = DEFAULT_PREFERENCES.transitionDirection
      routeTransition.value = DEFAULT_PREFERENCES.routeTransition
      routeTransitionSpeed.value = DEFAULT_PREFERENCES.routeTransitionSpeed
      showTabs.value = DEFAULT_PREFERENCES.showTabs

      applyPrimaryColorToDOM(
        DEFAULT_PREFERENCES.primaryColor,
        DEFAULT_PREFERENCES.blackAsPrimary,
        systemPrefersDark()
      )
      applyRadiusToDOM(DEFAULT_PREFERENCES.radius)
      applyColorVisionToDOM(DEFAULT_PREFERENCES.colorVision)
      applyRouteTransitionToDOM(DEFAULT_PREFERENCES.routeTransition)
      applyRouteTransitionSpeedToDOM(DEFAULT_PREFERENCES.routeTransitionSpeed)

      writeStorage(PRIMARY_COLOR_KEY, DEFAULT_PREFERENCES.primaryColor)
      writeStorage(BLACK_AS_PRIMARY_KEY, '0')
      writeStorage(RADIUS_KEY, DEFAULT_PREFERENCES.radius)
      writeStorage(COLOR_VISION_KEY, DEFAULT_PREFERENCES.colorVision)
      writeStorage(DIRECTION_KEY, DEFAULT_PREFERENCES.transitionDirection)
      writeStorage(ROUTE_TRANSITION_KEY, DEFAULT_PREFERENCES.routeTransition)
      writeStorage(
        ROUTE_TRANSITION_SPEED_KEY,
        DEFAULT_PREFERENCES.routeTransitionSpeed
      )
      writeStorage(SHOW_TABS_KEY, '1')

      // 主题模式回「跟随系统」（color-mode 模块自行更新 class）
      colorMode.preference = DEFAULT_PREFERENCES.themeMode
    }, direction)

    // runViewTransition 结束时会把「启动前临时移除的 data-route-transition」还原
    // 为旧值，而本次已把它重置为默认档，按 store 终态再校正一次保证 DOM 一致
    applyRouteTransitionToDOM(routeTransition.value)
  }

  return {
    primaryColor,
    blackAsPrimary,
    radius,
    colorVision,
    transitionDirection,
    routeTransition,
    routeTransitionSpeed,
    showTabs,
    themeMode,
    isDark,
    setPrimaryColor,
    setBlackAsPrimary,
    shufflePrimaryColor,
    setRadius,
    setColorVision,
    setTransitionDirection,
    setRouteTransition,
    setRouteTransitionSpeed,
    setShowTabs,
    setThemeMode,
    resetPreferences
  }
})
