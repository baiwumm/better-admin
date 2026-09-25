import type { LucideIcon } from "lucide-react";

import {
  Blinds,
  CircleDashed,
  CircleDot,
  Clock,
  Diamond,
  Fan,
  Grid3X3,
  Hexagon,
  RectangleHorizontal,
  ScanLine,
  Square,
  Star,
  Triangle,
  UnfoldHorizontal,
  Waves,
} from "lucide-react";
import { ThemeAnimationType } from "theme-switch-animation/react";

/**
 * 15 种主题切换动画类型（顺序与库 `ThemeAnimationType` 的定义顺序一致）。
 *
 * 每项三个字段：类型值（传给库）、卡片提示文案的 i18n 键、形状示意图标
 * （lucide kebab 名对应的组件，与菜单图标同图标集）。
 * 类型名（CIRCLE / BLINDS / STAR…）本身是技术专名，卡片上保留英文不译，提示文案走 i18n。
 * 0.2.0 起四向擦除类型（LTR/RTL/TTB/BTT）移除、并入 `direction` 选项，
 * 由 BLINDS / SCAN / QR_GRID 三种条带/格子类型消费；
 * 0.4.0 起 `CIRCLE_REVERT` 移除，"切暗扩散、切亮收起"由 `CIRCLE + reverse: 'auto'`
 * 承接（演示页参数区的「反向揭开」三档控件，对 CIRCLE / FAN / RIPPLE /
 * CLOCK_SWEEP / CURTAIN 五类生效，其余类型传了静默忽略）。
 *
 * 卡片强调色不入本清单：按数组下标循环取 `DEMO_ACCENTS`（与其它演示页同口径——
 * 演示色板是组件参数值，不是项目 Design Token，不参与 §7.3 的 token 约束）。
 */
export const DEMO_ANIMATION_TYPES = [
  {
    type: ThemeAnimationType.CIRCLE,
    hintKey: "features.playground.themeSwitchAnimation.type.circle",
    icon: CircleDot,
  },
  {
    type: ThemeAnimationType.CIRCLE_BLUR,
    hintKey: "features.playground.themeSwitchAnimation.type.circleBlur",
    icon: CircleDashed,
  },
  {
    type: ThemeAnimationType.SQUARE,
    hintKey: "features.playground.themeSwitchAnimation.type.square",
    icon: Square,
  },
  {
    type: ThemeAnimationType.DIAMOND,
    hintKey: "features.playground.themeSwitchAnimation.type.diamond",
    icon: Diamond,
  },
  {
    type: ThemeAnimationType.RECTANGLE,
    hintKey: "features.playground.themeSwitchAnimation.type.rectangle",
    icon: RectangleHorizontal,
  },
  {
    type: ThemeAnimationType.HEXAGON,
    hintKey: "features.playground.themeSwitchAnimation.type.hexagon",
    icon: Hexagon,
  },
  {
    type: ThemeAnimationType.TRIANGLE,
    hintKey: "features.playground.themeSwitchAnimation.type.triangle",
    icon: Triangle,
  },
  {
    type: ThemeAnimationType.STAR,
    hintKey: "features.playground.themeSwitchAnimation.type.star",
    icon: Star,
  },
  {
    type: ThemeAnimationType.BLINDS,
    hintKey: "features.playground.themeSwitchAnimation.type.blinds",
    icon: Blinds,
  },
  {
    type: ThemeAnimationType.SCAN,
    hintKey: "features.playground.themeSwitchAnimation.type.scan",
    icon: ScanLine,
  },
  {
    type: ThemeAnimationType.QR_GRID,
    hintKey: "features.playground.themeSwitchAnimation.type.qrGrid",
    icon: Grid3X3,
  },
  {
    type: ThemeAnimationType.RIPPLE,
    hintKey: "features.playground.themeSwitchAnimation.type.ripple",
    icon: Waves,
  },
  {
    type: ThemeAnimationType.CLOCK_SWEEP,
    hintKey: "features.playground.themeSwitchAnimation.type.clockSweep",
    icon: Clock,
  },
  {
    type: ThemeAnimationType.FAN,
    hintKey: "features.playground.themeSwitchAnimation.type.fan",
    icon: Fan,
  },
  {
    type: ThemeAnimationType.CURTAIN,
    hintKey: "features.playground.themeSwitchAnimation.type.curtain",
    icon: UnfoldHorizontal,
  },
] as const;

/** 单条动画类型定义 */
export type DemoAnimationTypeItem = (typeof DEMO_ANIMATION_TYPES)[number];

/**
 * 动画类型联合。从清单推导而非直接引用库的类型：清单是唯一事实源，
 * 增删类型时二者不会漂移（库新增类型时页面会提示清单未覆盖）。
 */
export type DemoAnimationType = DemoAnimationTypeItem["type"];

/** 形状示意图标的组件类型（卡片 props 用，避免在页面里写死具体图标） */
export type DemoAnimationIcon = LucideIcon;
