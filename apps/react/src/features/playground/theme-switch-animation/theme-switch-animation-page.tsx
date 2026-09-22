import {
  prefersReducedMotion,
  supportsViewTransition,
} from "theme-switch-animation";
import {
  ThemeAnimationDirection,
  ThemeAnimationType,
  useThemeAnimation,
} from "theme-switch-animation/react";
import { Button, cn } from "@heroui/react";
import { Monitor, Moon, Sun, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DemoControl,
  DemoSection,
  DemoStage,
  PlaygroundPage,
} from "../demo-section";
import { DemoSegmented, DemoSlider } from "../demo-controls";
import { DEMO_ACCENTS } from "../demo-palette";

import {
  DEMO_ANIMATION_TYPES,
  type DemoAnimationIcon,
  type DemoAnimationType,
} from "./animation-types";
import { themeSwitchAnimationMeta } from "./meta";

import { useTranslation } from "@/i18n";
import {
  applyThemeModeInstant,
  useResolvedTheme,
} from "@/stores/design-theme-store";

/** 演示页在转场期间挂到 `<html>` 的「摘名属性」（规则见 styles/theme-transition.css）。 */
const DEMO_VT_ATTR = "data-theme-demo-vt";
/** 摘名属性比动画时长多保留一段，避免在计时边界上提前摘名。 */
const SETTLE_BUFFER_MS = 150;

const DURATION_RANGE = { min: 200, max: 1500, step: 50 };
const BLUR_RANGE = { min: 1, max: 10, step: 0.5 };
/** BLINDS 叶片宽度合法域（库约定 16–200px，越界静默回落默认 72） */
const SLAT_WIDTH_RANGE = { min: 16, max: 200, step: 2 };
const SLAT_WIDTH_DEFAULT = 72;

/** 消费 `direction` 选项的三种属性驱动类型（其余类型传入无效果） */
const DIRECTION_CONSUMING_TYPES: readonly DemoAnimationType[] = [
  ThemeAnimationType.BLINDS,
  ThemeAnimationType.SCAN,
  ThemeAnimationType.QR_GRID,
];

const DIRECTION_PRESETS = [
  ThemeAnimationDirection.LTR,
  ThemeAnimationDirection.RTL,
  ThemeAnimationDirection.TTB,
  ThemeAnimationDirection.BTT,
] as const;

const EASING_PRESETS = [
  { id: "ease-in-out", label: "ease-in-out" },
  { id: "cubic-bezier(0.4, 0, 0.2, 1)", label: "cubic-bezier" },
  { id: "linear", label: "linear" },
] as const;

type EasingId = (typeof EASING_PRESETS)[number]["id"];

interface AnimationParams {
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
}

/**
 * 摘名属性的模块级单例：所有触发按钮共用 `<html>` 上的同一个属性。
 *
 * 库内部 startViewTransition 是串行的（同一文档同一时刻只会有一轮转场），但快速连点
 * 不同按钮时，若各实例各自计时，先点击的实例会提前摘名、让后一轮转场的 mask 揭示
 * 重新被 main-content 快照组遮挡——故统一走一个计时器，只认最后一次触发。
 */
let releaseTimer: number | undefined;

function holdDemoVtAttribute(duration: number): void {
  const root = document.documentElement;

  window.clearTimeout(releaseTimer);
  root.setAttribute(DEMO_VT_ATTR, "");
  releaseTimer = window.setTimeout(() => {
    root.removeAttribute(DEMO_VT_ATTR);
    releaseTimer = undefined;
  }, duration + SETTLE_BUFFER_MS);
}

/**
 * 演示用主题切换：受控模式接入项目主题 store。
 *
 * - `isDark` 取 store 的 resolved 外观（与页头主题选择器、Logo 深浅色同一状态源，
 *   因此演示页切换后全站状态同步）；
 * - `onChange` 走 `applyThemeModeInstant`——只落状态、不编排动画，把转场编排权让给库的
 *   mask 揭示。若改走 `setThemeMode`，它内部会再开一次 View Transition，
 *   同一文档内后启动者抢占并跳过前者，库的揭示动画会失效；
 * - 触发前挂摘名属性，让 main-content 并入 root 单组（否则其静止快照会遮挡 mask 揭示）。
 *
 * 摘名与「动画期间禁用」都按「本次时长 + 缓冲」计时，而不是消费库返回的 `finished`：
 * 该值是 state，点击当次渲染里读到的仍是上一次的 promise（库文档：需等切换后的渲染
 * 才可见新值），用它会在动画刚开始时就把属性摘掉。
 */
function useDemoThemeAnimation(params: AnimationParams) {
  const isDark = useResolvedTheme() === "dark";
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const { ref, toggleTheme } = useThemeAnimation<HTMLDivElement>({
    animationType: params.animationType,
    blurAmount: params.blurAmount,
    direction: params.direction,
    duration: params.duration,
    easing: params.easing,
    slatWidth: params.slatWidth,
    isDark,
    onChange: (next) => applyThemeModeInstant(next ? "dark" : "light"),
  });

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    [],
  );

  const toggle = () => {
    // 摘名属性必须在库启动 startViewTransition 之前落地：快照捕获发生在转场启动时，
    // 晚挂属性会让本次转场仍按「main-content 独立快照组」捕获。
    holdDemoVtAttribute(params.duration);
    setIsAnimating(true);
    toggleTheme();
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => setIsAnimating(false),
      params.duration + SETTLE_BUFFER_MS,
    );
  };

  return { isAnimating, isDark, ref, toggle };
}

/**
 * 单张动画类型卡：左侧形状示意图标 + 中间类型名与提示 + 右侧圆形触发按钮。
 *
 * 卡片本身**不是**触发点——只有右侧圆钮可点（避免整卡误触，也让「扩散圆心」在视觉上
 * 指向一个明确的圆）。每个实例都是独立的 `useThemeAnimation`。
 */
function AnimationTypeCard({
  hintKey,
  icon: Icon,
  index,
  params,
  type,
}: {
  hintKey: string;
  icon: DemoAnimationIcon;
  index: number;
  params: AnimationParams;
  type: DemoAnimationType;
}) {
  const { t } = useTranslation();
  const { isAnimating, isDark, ref, toggle } = useDemoThemeAnimation(params);
  // 强调色按数组下标循环取演示色板：色板是演示参数值（见 animation-types.ts 注释），
  // 卡片结构与交互一律走项目 Design Token，不引入第二套视觉变量。
  const accent = DEMO_ACCENTS[index % DEMO_ACCENTS.length];
  const actionLabel = t(
    isDark
      ? "features.playground.themeSwitchAnimation.switchToLight"
      : "features.playground.themeSwitchAnimation.switchToDark",
  );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-default/40 p-3">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{
          backgroundImage: `linear-gradient(135deg, ${accent}33, ${accent}12)`,
          color: accent,
        }}
      >
        <Icon className="size-5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* 类型名是技术专名，保留英文不译；提示文案走 i18n */}
        <span className="font-mono text-xs font-medium">{type}</span>
        <span className="text-xs leading-snug text-muted">{t(hintKey)}</span>
      </div>

      {/*
       * 渐变描边圆钮：外层 p-px 只留 1px 渐变环，内层按钮以 bg-surface 实心底遮出圆面。
       * HeroUI 组件样式在 `components` 层、Tailwind 工具类在 `utilities` 层（层序优先于
       * 选择器优先级），故 bg-surface / rounded-full 能稳定覆盖 `.button--ghost` 的透明底与
       * `.button` 的 rounded-3xl。`isIconOnly` + 默认尺寸本身即正方形（40px / md:36px），
       * 配 rounded-full 得正圆；不需要再强制宽高。
       * ref 挂外层：与按钮同心、尺寸仅差 1px 环，库取该元素 rect 中心即按钮圆心；
       * 不依赖 Button 的 ref 透传实现。
       */}
      <div
        ref={ref}
        className="shrink-0 rounded-full p-px"
        style={{
          backgroundImage: `linear-gradient(135deg, ${accent}e6, ${accent}4d)`,
        }}
      >
        <Button
          isIconOnly
          aria-label={`${type} · ${actionLabel}`}
          className="rounded-full bg-surface text-foreground shadow-sm hover:shadow-md"
          isDisabled={isAnimating}
          variant="ghost"
          onPress={toggle}
        >
          {isDark ? <Moon /> : <Sun />}
        </Button>
      </div>
    </div>
  );
}

/** 区块一：12 种动画类型，逐类型点击体验（圆心取圆钮中心，网格不同位置即不同起点）。 */
function TypeGridSection({ params }: { params: AnimationParams }) {
  const { t } = useTranslation();

  return (
    <DemoSection
      description={t(
        "features.playground.themeSwitchAnimation.gridDescription",
      )}
      title={t("features.playground.themeSwitchAnimation.gridTitle")}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_ANIMATION_TYPES.map((item, index) => (
          <AnimationTypeCard
            key={item.type}
            hintKey={item.hintKey}
            icon={item.icon}
            index={index}
            params={{ ...params, animationType: item.type }}
            type={item.type}
          />
        ))}
      </div>
    </DemoSection>
  );
}

/** 区块二：选中一种动画并调节时长 / 缓动 / 模糊强度 / 方向 / 叶宽，再以该参数触发一次切换。 */
function ParamsSection({
  animationType,
  blurAmount,
  direction,
  duration,
  easing,
  slatWidth,
  onAnimationTypeChange,
  onBlurAmountChange,
  onDirectionChange,
  onDurationChange,
  onEasingChange,
  onSlatWidthChange,
}: {
  animationType: DemoAnimationType;
  blurAmount: number;
  direction: ThemeAnimationDirection;
  duration: number;
  easing: EasingId;
  slatWidth: number;
  onAnimationTypeChange: (type: DemoAnimationType) => void;
  onBlurAmountChange: (value: number) => void;
  onDirectionChange: (value: ThemeAnimationDirection) => void;
  onDurationChange: (value: number) => void;
  onEasingChange: (value: EasingId) => void;
  onSlatWidthChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const { isAnimating, ref, toggle } = useDemoThemeAnimation({
    animationType,
    blurAmount,
    direction,
    duration,
    easing,
    slatWidth,
  });

  return (
    <DemoSection
      controls={
        <>
          <DemoControl label={t("features.playground.common.duration")}>
            <DemoSlider
              formatOptions={{ style: "unit", unit: "millisecond" }}
              label={t("features.playground.common.duration")}
              maxValue={DURATION_RANGE.max}
              minValue={DURATION_RANGE.min}
              step={DURATION_RANGE.step}
              value={duration}
              onChange={onDurationChange}
            />
          </DemoControl>
          <DemoControl
            label={t("features.playground.themeSwitchAnimation.easing")}
          >
            <DemoSegmented<EasingId>
              label={t("features.playground.themeSwitchAnimation.easing")}
              options={EASING_PRESETS.map((preset) => ({
                id: preset.id,
                label: preset.label,
              }))}
              value={easing}
              onChange={onEasingChange}
            />
          </DemoControl>
          {animationType === ThemeAnimationType.CIRCLE_BLUR ? (
            <DemoControl
              label={t("features.playground.themeSwitchAnimation.blurAmount")}
            >
              <DemoSlider
                label={t("features.playground.themeSwitchAnimation.blurAmount")}
                maxValue={BLUR_RANGE.max}
                minValue={BLUR_RANGE.min}
                step={BLUR_RANGE.step}
                value={blurAmount}
                onChange={onBlurAmountChange}
              />
            </DemoControl>
          ) : null}
          {DIRECTION_CONSUMING_TYPES.includes(animationType) ? (
            <DemoControl
              label={t("features.playground.themeSwitchAnimation.direction")}
            >
              <DemoSegmented<ThemeAnimationDirection>
                label={t("features.playground.themeSwitchAnimation.direction")}
                options={DIRECTION_PRESETS.map((preset) => ({
                  id: preset,
                  label: t(
                    `features.playground.themeSwitchAnimation.direction.${preset}`,
                  ),
                }))}
                value={direction}
                onChange={onDirectionChange}
              />
            </DemoControl>
          ) : null}
          {animationType === ThemeAnimationType.BLINDS ? (
            <DemoControl
              label={t("features.playground.themeSwitchAnimation.slatWidth")}
            >
              {/* 像素值不传 formatOptions：Intl 单位无 "pixel"，传入会抛 RangeError */}
              <DemoSlider
                label={t("features.playground.themeSwitchAnimation.slatWidth")}
                maxValue={SLAT_WIDTH_RANGE.max}
                minValue={SLAT_WIDTH_RANGE.min}
                step={SLAT_WIDTH_RANGE.step}
                value={slatWidth}
                onChange={onSlatWidthChange}
              />
            </DemoControl>
          ) : null}
        </>
      }
      description={t(
        "features.playground.themeSwitchAnimation.paramsDescription",
      )}
      title={t("features.playground.themeSwitchAnimation.paramsTitle")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            {t("features.playground.themeSwitchAnimation.animationType")}
          </span>
          <div className="flex flex-wrap gap-2">
            {DEMO_ANIMATION_TYPES.map((item) => (
              <Button
                key={item.type}
                aria-label={item.type}
                className="font-mono text-xs"
                size="sm"
                variant={item.type === animationType ? "primary" : "outline"}
                onPress={() => onAnimationTypeChange(item.type)}
              >
                {item.type}
              </Button>
            ))}
          </div>
        </div>
        <div ref={ref} className="flex">
          <Button isDisabled={isAnimating} variant="secondary" onPress={toggle}>
            <Wand2 className="size-4" />
            {t("features.playground.themeSwitchAnimation.triggerLabel")}
          </Button>
        </div>
      </div>
    </DemoSection>
  );
}

/** 区块三：同一动画类型、三个水平位置不同的触发点，验证圆心跟随触发元素中心。 */
function AlignedTrigger({
  align,
  index,
  params,
}: {
  align: string;
  index: number;
  params: AnimationParams;
}) {
  const { t } = useTranslation();
  const { isAnimating, ref, toggle } = useDemoThemeAnimation(params);

  return (
    <div className={cn("flex", align)}>
      <div ref={ref}>
        <Button
          isDisabled={isAnimating}
          size="sm"
          variant="secondary"
          onPress={toggle}
        >
          {t("features.playground.themeSwitchAnimation.pointLabel", { index })}
        </Button>
      </div>
    </div>
  );
}

function TriggerPointSection({ params }: { params: AnimationParams }) {
  const { t } = useTranslation();

  return (
    <DemoSection
      description={t(
        "features.playground.themeSwitchAnimation.pointDescription",
      )}
      title={t("features.playground.themeSwitchAnimation.pointTitle")}
    >
      <DemoStage className="flex-col items-stretch justify-between gap-6">
        {["justify-start", "justify-center", "justify-end"].map(
          (align, position) => (
            <AlignedTrigger
              key={align}
              align={align}
              index={position + 1}
              params={params}
            />
          ),
        )}
      </DemoStage>
    </DemoSection>
  );
}

/** 区块四：运行环境与降级行为，以及「回到跟随系统」的收尾入口。 */
function EnvironmentSection() {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const [env, setEnv] = useState<{
    reduced: boolean;
    supported: boolean;
  } | null>(null);

  // 能力探测只在客户端执行（SSR 环境没有 document / window）
  useEffect(() => {
    setEnv({
      reduced: prefersReducedMotion(window),
      supported: supportsViewTransition(document),
    });
  }, []);

  return (
    <DemoSection
      controls={
        <Button
          size="sm"
          variant="secondary"
          onPress={() => applyThemeModeInstant("system")}
        >
          <Monitor className="size-4" />
          {t("features.playground.themeSwitchAnimation.resetToSystem")}
        </Button>
      }
      description={t("features.playground.themeSwitchAnimation.envDescription")}
      title={t("features.playground.themeSwitchAnimation.envTitle")}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
          {env?.supported ? (
            <span className="size-2 rounded-full bg-success" />
          ) : (
            <span className="size-2 rounded-full bg-danger" />
          )}
          {t(
            env?.supported
              ? "features.playground.themeSwitchAnimation.supported"
              : "features.playground.themeSwitchAnimation.unsupported",
          )}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
          <span
            className={cn(
              "size-2 rounded-full",
              env?.reduced ? "bg-warning" : "bg-default",
            )}
          />
          {t(
            env?.reduced
              ? "features.playground.themeSwitchAnimation.reduceMotion"
              : "features.playground.themeSwitchAnimation.reduceMotionOff",
          )}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
          {isDark ? (
            <Moon className="size-3.5" />
          ) : (
            <Sun className="size-3.5" />
          )}
          {t(
            isDark
              ? "features.playground.themeSwitchAnimation.currentTheme.dark"
              : "features.playground.themeSwitchAnimation.currentTheme.light",
          )}
        </span>
      </div>
      <p className="text-xs text-muted">
        {t("features.playground.themeSwitchAnimation.fallbackNote")}
      </p>
    </DemoSection>
  );
}

/**
 * 演示场 › 主题切换动画：`theme-switch-animation`（View Transitions API 蒙版揭示）。
 *
 * 与项目既有主题切换（`stores/design-theme-store` 的 clip-path 四向揭示）**并存**：
 * 本页只演示库的 12 种蒙版动画，受控模式接入同一主题 store，不替换业务的主题动画实现。
 */
export function ThemeSwitchAnimationPage() {
  const [animationType, setAnimationType] = useState<DemoAnimationType>(
    ThemeAnimationType.CIRCLE,
  );
  const [duration, setDuration] = useState(750);
  const [easing, setEasing] = useState<EasingId>("ease-in-out");
  const [blurAmount, setBlurAmount] = useState(2);
  const [direction, setDirection] = useState<ThemeAnimationDirection>(
    ThemeAnimationDirection.LTR,
  );
  const [slatWidth, setSlatWidth] = useState(SLAT_WIDTH_DEFAULT);

  // 离开页面时兜底摘除摘名属性（正常路径由模块级计时器摘除），
  // 避免遗留属性让路由过渡动画失去 main-content 独立快照组。
  useEffect(
    () => () => {
      document.documentElement.removeAttribute(DEMO_VT_ATTR);
    },
    [],
  );

  const params: AnimationParams = {
    animationType,
    blurAmount,
    direction,
    duration,
    easing,
    slatWidth,
  };

  return (
    <PlaygroundPage meta={themeSwitchAnimationMeta}>
      <TypeGridSection params={params} />
      <ParamsSection
        animationType={animationType}
        blurAmount={blurAmount}
        direction={direction}
        duration={duration}
        easing={easing}
        slatWidth={slatWidth}
        onAnimationTypeChange={setAnimationType}
        onBlurAmountChange={setBlurAmount}
        onDirectionChange={setDirection}
        onDurationChange={setDuration}
        onEasingChange={setEasing}
        onSlatWidthChange={setSlatWidth}
      />
      <TriggerPointSection params={params} />
      <EnvironmentSection />
    </PlaygroundPage>
  );
}
