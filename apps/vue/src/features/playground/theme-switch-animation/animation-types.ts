import { ThemeAnimationType } from "theme-switch-animation/vue";

/**
 * 13 种主题切换动画类型（顺序与库 `ThemeAnimationType` 的定义顺序一致）。
 *
 * 每项三个字段：类型值（传给库）、卡片提示文案的 i18n 键、形状示意图标的 iconify 名
 * （`i-lucide-*`，与菜单图标同图标集）。
 * 类型名（CIRCLE / LTR / STAR…）本身是技术专名，卡片上保留英文不译，提示文案走 i18n。
 *
 * 卡片强调色不入本清单：按数组下标循环取 `DEMO_ACCENTS`（与其它演示页同口径——
 * 演示色板是组件参数值，不是项目 Design Token，不参与 §7.3 的 token 约束）。
 */
export const DEMO_ANIMATION_TYPES = [
  {
    type: ThemeAnimationType.CIRCLE,
    hintKey: "features.playground.themeSwitchAnimation.type.circle",
    icon: "i-lucide-circle-dot",
  },
  {
    type: ThemeAnimationType.CIRCLE_REVERT,
    hintKey: "features.playground.themeSwitchAnimation.type.circleRevert",
    icon: "i-lucide-circle-dot-dashed",
  },
  {
    type: ThemeAnimationType.CIRCLE_BLUR,
    hintKey: "features.playground.themeSwitchAnimation.type.circleBlur",
    icon: "i-lucide-circle-dashed",
  },
  {
    type: ThemeAnimationType.LTR,
    hintKey: "features.playground.themeSwitchAnimation.type.ltr",
    icon: "i-lucide-arrow-right",
  },
  {
    type: ThemeAnimationType.RTL,
    hintKey: "features.playground.themeSwitchAnimation.type.rtl",
    icon: "i-lucide-arrow-left",
  },
  {
    type: ThemeAnimationType.TTB,
    hintKey: "features.playground.themeSwitchAnimation.type.ttb",
    icon: "i-lucide-arrow-down",
  },
  {
    type: ThemeAnimationType.BTT,
    hintKey: "features.playground.themeSwitchAnimation.type.btt",
    icon: "i-lucide-arrow-up",
  },
  {
    type: ThemeAnimationType.SQUARE,
    hintKey: "features.playground.themeSwitchAnimation.type.square",
    icon: "i-lucide-square",
  },
  {
    type: ThemeAnimationType.DIAMOND,
    hintKey: "features.playground.themeSwitchAnimation.type.diamond",
    icon: "i-lucide-diamond",
  },
  {
    type: ThemeAnimationType.RECTANGLE,
    hintKey: "features.playground.themeSwitchAnimation.type.rectangle",
    icon: "i-lucide-rectangle-horizontal",
  },
  {
    type: ThemeAnimationType.HEXAGON,
    hintKey: "features.playground.themeSwitchAnimation.type.hexagon",
    icon: "i-lucide-hexagon",
  },
  {
    type: ThemeAnimationType.TRIANGLE,
    hintKey: "features.playground.themeSwitchAnimation.type.triangle",
    icon: "i-lucide-triangle",
  },
  {
    type: ThemeAnimationType.STAR,
    hintKey: "features.playground.themeSwitchAnimation.type.star",
    icon: "i-lucide-star",
  },
] as const;

/** 单条动画类型定义 */
export type DemoAnimationTypeItem = (typeof DEMO_ANIMATION_TYPES)[number];

/**
 * 动画类型联合。从清单推导而非直接引用库的类型：清单是唯一事实源，
 * 增删类型时二者不会漂移（库新增类型时页面会提示清单未覆盖）。
 */
export type DemoAnimationType = DemoAnimationTypeItem["type"];
