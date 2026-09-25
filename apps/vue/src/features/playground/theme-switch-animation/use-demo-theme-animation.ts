import { computed, onBeforeUnmount, ref } from "vue";
import {
  useThemeAnimation,
  type ThemeAnimationDirection,
} from "theme-switch-animation/vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";

import type { DemoAnimationType } from "./animation-types";

/** 演示页在转场期间挂到 `<html>` 的「摘名属性」（规则见 styles/theme-transition.css）。 */
const DEMO_VT_ATTR = "data-theme-demo-vt";
/** 摘名属性 / 禁用态比动画时长多保留一段，避免在计时边界上提前释放。 */
const SETTLE_BUFFER_MS = 150;

/**
 * 「反向揭开」三档的控件取值（DemoSegmented 要求字符串 id；对齐 React 端同名类型）。
 * `auto` 即 0.2/0.3 时代 `CIRCLE_REVERT` 的语义——切暗正向、切亮收起，
 * 跟随本次切换方向；库默认 `false`（总是正向），演示页取 `auto` 以保留原
 * CIRCLE_REVERT 卡的标志性观感。
 */
export type ReverseMode = "off" | "on" | "auto";

/** ReverseMode → 库选项 `reverse` 的取值（off→false / on→true / auto→'auto'） */
export function toLibraryReverse(mode: ReverseMode): boolean | "auto" {
  return mode === "off" ? false : mode === "on" ? true : "auto";
}

export interface AnimationParams {
  animationType: DemoAnimationType;
  /** 动画时长 ms */
  duration: number;
  /** 任意合法 CSS timing-function */
  easing: string;
  /** 模糊蒙版强度，仅 CIRCLE_BLUR 生效 */
  blurAmount: number;
  /** 扫描方向，仅 BLINDS / SCAN / QR_GRID 生效（0.2.0 起四向擦除并入此选项） */
  direction: ThemeAnimationDirection;
  /** 百叶窗叶片宽度 px，仅 BLINDS 生效 */
  slatWidth: number;
  /** 涟漪波长 px，仅 RIPPLE 生效 */
  waveWidth: number;
  /** 扇叶数，仅 FAN 生效 */
  bladeCount: number;
  /** 反向揭开三档，仅 CIRCLE / FAN / RIPPLE / CLOCK_SWEEP / CURTAIN 生效（0.4.0 起） */
  reverse: ReverseMode;
}

/**
 * 摘名属性的模块级单例：所有触发按钮共用 `<html>` 上的同一个属性。
 *
 * 库内部 startViewTransition 是串行的（同一文档同一时刻只会有一轮转场），但快速连点
 * 不同按钮时，若各实例各自计时，先点击的实例会提前摘名、让后一轮转场的 mask 揭示
 * 重新被 main-content 快照组遮挡——故统一走一个计时器，只认最后一次触发。
 */
let releaseTimer: ReturnType<typeof setTimeout> | undefined;

function holdDemoVtAttribute(duration: number): void {
  clearTimeout(releaseTimer);
  document.documentElement.setAttribute(DEMO_VT_ATTR, "");
  releaseTimer = setTimeout(() => {
    document.documentElement.removeAttribute(DEMO_VT_ATTR);
    releaseTimer = undefined;
  }, duration + SETTLE_BUFFER_MS);
}

/**
 * 演示用主题切换：受控模式接入项目主题 store（对齐 React 端 `useDemoThemeAnimation`）。
 *
 * - `getParams` 传取值函数，库内 `options` 用「取值器对象」而非普通字面量：库的
 *   `isDark` / `mode` 都是 `computed(() => options.xxx)`，只有读取时能追踪到真实来源
 *   才有响应性（普通字面量只在 setup 当次取快照，切换后图标与受控判定都不会更新），
 *   故这里用 getter 让每次读取都落到 props / store 上；
 * - `onChange` 走 `store.applyThemeModeInstant`——只落状态、不编排动画，把转场编排权让给
 *   库的 mask 揭示。若走 `setThemeMode`，它内部会再开一次 View Transition，
 *   同一文档内后启动者抢占并跳过前者，库的揭示动画会失效；
 * - 触发前挂摘名属性，让 main-content 并入 root 单组（否则其静止快照会遮挡 mask 揭示）。
 *
 * 摘名与「动画期间禁用」都按「本次时长 + 缓冲」计时，而不是消费库返回的 `finished`：
 * 该值是 shallowRef，要在切换后的渲染才可见新 Promise，用它会在动画刚开始就解禁。
 */
export function useDemoThemeAnimation<
  T extends HTMLElement = HTMLButtonElement,
>(getParams: () => AnimationParams) {
  const store = useDesignThemeStore();
  const isAnimating = ref(false);
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  const { triggerRef, toggleTheme } = useThemeAnimation<T>({
    get animationType() {
      return getParams().animationType;
    },
    get bladeCount() {
      return getParams().bladeCount;
    },
    get blurAmount() {
      return getParams().blurAmount;
    },
    get direction() {
      return getParams().direction;
    },
    get duration() {
      return getParams().duration;
    },
    get easing() {
      return getParams().easing;
    },
    get reverse() {
      return toLibraryReverse(getParams().reverse);
    },
    get slatWidth() {
      return getParams().slatWidth;
    },
    get waveWidth() {
      return getParams().waveWidth;
    },
    get isDark() {
      return store.isDark;
    },
    onChange: (next: boolean) => {
      store.applyThemeModeInstant(next ? "dark" : "light");
    },
  });

  /** 与页头主题选择器、Logo 深浅色同一状态源：演示页切换后全站同步 */
  const isDark = computed(() => store.isDark);

  function toggle(): void {
    const { duration } = getParams();

    // 摘名属性必须在库启动 startViewTransition 之前落地：快照捕获发生在转场启动时，
    // 晚挂属性会让本次转场仍按「main-content 独立快照组」捕获。
    holdDemoVtAttribute(duration);
    isAnimating.value = true;
    toggleTheme();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      isAnimating.value = false;
    }, duration + SETTLE_BUFFER_MS);
  }

  onBeforeUnmount(() => clearTimeout(settleTimer));

  return { isAnimating, isDark, triggerRef, toggle };
}
