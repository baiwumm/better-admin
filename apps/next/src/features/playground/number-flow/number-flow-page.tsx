"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { Button } from "@heroui/react";
import { Minus, Pause, Play, Plus, RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DemoControl,
  DemoSection,
  DemoStage,
  PlaygroundPage,
} from "../demo-section";
import { DemoSlider } from "../demo-controls";

import { numberFlowMeta } from "./meta";

import { useTranslation } from "@/i18n";

const LIVE_INTERVAL_MS = 1500;
const COUNTDOWN_SECONDS = 90;
const STEPPER_MIN = 0;
const STEPPER_MAX = 999_999;

/** 有界随机游走：模拟在线人数等实时指标的自然波动。 */
function nextLiveValue(current: number) {
  const delta = Math.round((Math.random() - 0.45) * 60);

  return Math.max(120, Math.min(9_999, current + delta));
}

const LIVE_INITIAL = 1_284;
const STEPPER_INITIAL = 1_250;

/** 实时数字：定时器写在 effect 内，keepAlive 后台（Activity hidden）自动停摆、切回重启。 */
function LiveSection() {
  const { t } = useTranslation();
  const [running, setRunning] = useState(true);
  const [value, setValue] = useState(LIVE_INITIAL);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setValue((current) => nextLiveValue(current)),
      LIVE_INTERVAL_MS,
    );

    return () => clearInterval(timer);
  }, [running]);

  return (
    <DemoSection
      controls={
        <Button
          size="sm"
          variant="secondary"
          onPress={() => setRunning((current) => !current)}
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {t(
            running
              ? "features.playground.common.pause"
              : "features.playground.common.start",
          )}
        </Button>
      }
      description={t("features.playground.numberFlow.liveDescription")}
      title={t("features.playground.numberFlow.liveTitle")}
    >
      <DemoStage>
        <div className="flex flex-col items-center gap-1">
          <NumberFlow
            className="text-5xl font-bold tabular-nums"
            value={value}
          />
          <span className="text-sm text-muted">
            {t("features.playground.numberFlow.liveLabel")}
          </span>
        </div>
      </DemoStage>
    </DemoSection>
  );
}

/** 倒计时：NumberFlowGroup 让分 / 秒两个数字同步动画；`digits` 限制十位秒最大 5。 */
function CountdownSection() {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [running, setRunning] = useState(false);
  const active = running && seconds > 0;

  // 每 tick 重排一次 setTimeout（依赖 seconds）：归零自然停摆，updater 保持纯函数
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);

    return () => clearTimeout(timer);
  }, [active, seconds]);

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return (
    <DemoSection
      controls={
        <>
          <Button
            isDisabled={seconds === 0}
            size="sm"
            variant="secondary"
            onPress={() => setRunning((current) => !current)}
          >
            {active ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {t(
              active
                ? "features.playground.common.pause"
                : "features.playground.common.start",
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              setRunning(false);
              setSeconds(COUNTDOWN_SECONDS);
            }}
          >
            <RotateCcw className="size-4" />
            {t("features.playground.common.reset")}
          </Button>
        </>
      }
      description={t("features.playground.numberFlow.countdownDescription")}
      title={t("features.playground.numberFlow.countdownTitle")}
    >
      <DemoStage>
        <NumberFlowGroup>
          <div className="flex items-baseline text-5xl font-bold tabular-nums">
            <NumberFlow
              format={{ minimumIntegerDigits: 2 }}
              trend={-1}
              value={minutes}
            />
            <span className="mx-1 text-muted">:</span>
            <NumberFlow
              digits={{ 1: { max: 5 } }}
              format={{ minimumIntegerDigits: 2 }}
              trend={-1}
              value={remainder}
            />
          </div>
        </NumberFlowGroup>
      </DemoStage>
    </DemoSection>
  );
}

/** 计数输入：加减 / 随机按钮驱动，货币格式跟随当前语言。 */
function StepperSection() {
  const { t, i18n } = useTranslation();
  const [value, setValue] = useState(STEPPER_INITIAL);

  const adjust = (delta: number) =>
    setValue((current) =>
      Math.max(STEPPER_MIN, Math.min(STEPPER_MAX, current + delta)),
    );

  return (
    <DemoSection
      controls={
        <>
          <Button
            isIconOnly
            aria-label={t("features.playground.common.decrease")}
            size="sm"
            variant="secondary"
            onPress={() => adjust(-100)}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            isIconOnly
            aria-label={t("features.playground.common.increase")}
            size="sm"
            variant="secondary"
            onPress={() => adjust(100)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() =>
              setValue(Math.round(Math.random() * STEPPER_MAX * 0.2))
            }
          >
            <Shuffle className="size-4" />
            {t("features.playground.common.random")}
          </Button>
        </>
      }
      description={t("features.playground.numberFlow.stepperDescription")}
      title={t("features.playground.numberFlow.stepperTitle")}
    >
      <DemoStage className="gap-10">
        <div className="flex flex-col items-center gap-1">
          <NumberFlow
            className="text-4xl font-bold tabular-nums"
            format={{ style: "currency", currency: "CNY" }}
            locales={i18n.language}
            value={value}
          />
          <span className="text-sm text-muted">
            {t("features.playground.numberFlow.stepperCurrency")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <NumberFlow
            className="text-4xl font-bold tabular-nums"
            locales={i18n.language}
            suffix={t("features.playground.numberFlow.stepperUnit")}
            value={value}
          />
          <span className="text-sm text-muted">
            {t("features.playground.numberFlow.stepperSuffix")}
          </span>
        </div>
      </DemoStage>
    </DemoSection>
  );
}

/** 滑块联动：Slider 值实时驱动百分比与进度数字。 */
function SliderSection() {
  const { t } = useTranslation();
  const [percent, setPercent] = useState(42);

  return (
    <DemoSection
      controls={
        <DemoControl label={t("features.playground.numberFlow.sliderLabel")}>
          <DemoSlider
            className="w-64"
            label={t("features.playground.numberFlow.sliderLabel")}
            maxValue={100}
            minValue={0}
            value={percent}
            onChange={setPercent}
          />
        </DemoControl>
      }
      description={t("features.playground.numberFlow.sliderDescription")}
      title={t("features.playground.numberFlow.sliderTitle")}
    >
      <DemoStage className="gap-10">
        <NumberFlow
          className="text-4xl font-bold tabular-nums"
          format={{ style: "percent", maximumFractionDigits: 0 }}
          value={percent / 100}
        />
        <NumberFlow
          className="text-4xl font-bold tabular-nums"
          format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          suffix=" GB"
          value={(percent / 100) * 512}
        />
      </DemoStage>
    </DemoSection>
  );
}

/**
 * 演示场 › 数字动画 › Number Flow：官方 `@number-flow/react`。
 * 实时数字 / 倒计时（Group 同步）/ 计数输入（货币 + 后缀）/ 滑块联动（百分比）。
 * Dashboard（Phase C）KPI 数字滚动直接复用本依赖。
 */
export function NumberFlowPage() {
  return (
    <PlaygroundPage meta={numberFlowMeta}>
      <LiveSection />
      <CountdownSection />
      <StepperSection />
      <SliderSection />
    </PlaygroundPage>
  );
}
