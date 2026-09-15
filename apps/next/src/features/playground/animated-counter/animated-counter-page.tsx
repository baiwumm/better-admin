"use client";

import type { Grouping } from "./animated-counter";

import { Button } from "@heroui/react";
import { Minus, Plus, Shuffle } from "lucide-react";
import { useState } from "react";

import {
  DemoControl,
  DemoSection,
  DemoStage,
  PlaygroundPage,
} from "../demo-section";
import { DemoSegmented, DemoSlider, DemoSwitch } from "../demo-controls";

import { AnimatedCounter } from "./animated-counter";
import { animatedCounterMeta } from "./meta";

import { useTranslation } from "@/i18n";

const BASIC_INITIAL = 1_024;
const PRICE_INITIAL = 12_345.67;
const ODOMETER_INITIAL = 42;
const BALANCE_INITIAL = 250;

/** 基础计数：加减 / 随机 + 时长滑块（滚轮 spring 时长）。 */
function BasicSection() {
  const { t } = useTranslation();
  const [value, setValue] = useState(BASIC_INITIAL);
  const [duration, setDuration] = useState(0.6);

  return (
    <DemoSection
      controls={
        <>
          <Button
            isIconOnly
            aria-label={t("features.playground.common.decrease")}
            size="sm"
            variant="secondary"
            onPress={() => setValue((current) => current - 1)}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            isIconOnly
            aria-label={t("features.playground.common.increase")}
            size="sm"
            variant="secondary"
            onPress={() => setValue((current) => current + 1)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setValue((current) => current + 100)}
          >
            +100
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setValue(Math.round(Math.random() * 99_999))}
          >
            <Shuffle className="size-4" />
            {t("features.playground.common.random")}
          </Button>
          <DemoControl label={t("features.playground.common.duration")}>
            <DemoSlider
              formatOptions={{
                style: "unit",
                unit: "second",
                maximumFractionDigits: 1,
              }}
              label={t("features.playground.common.duration")}
              maxValue={2}
              minValue={0.2}
              step={0.1}
              value={duration}
              onChange={setDuration}
            />
          </DemoControl>
        </>
      }
      description={t("features.playground.animatedCounter.basicDescription")}
      title={t("features.playground.animatedCounter.basicTitle")}
    >
      <DemoStage>
        <AnimatedCounter
          className="text-5xl font-bold"
          duration={duration}
          value={value}
        />
      </DemoStage>
    </DemoSection>
  );
}

/** 格式化：小数 / 前后缀 / 千分位分组（western vs indian）。 */
function FormatSection() {
  const { t } = useTranslation();
  const [price, setPrice] = useState(PRICE_INITIAL);
  const [grouping, setGrouping] = useState<Grouping>("western");

  return (
    <DemoSection
      controls={
        <>
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              setPrice(Math.round(Math.random() * 999_999_999) / 100)
            }
          >
            <Shuffle className="size-4" />
            {t("features.playground.common.random")}
          </Button>
          <DemoControl
            label={t("features.playground.animatedCounter.grouping")}
          >
            <DemoSegmented<Grouping>
              label={t("features.playground.animatedCounter.grouping")}
              options={[
                { id: "western", label: "1,234,567" },
                { id: "indian", label: "12,34,567" },
              ]}
              value={grouping}
              onChange={setGrouping}
            />
          </DemoControl>
        </>
      }
      description={t("features.playground.animatedCounter.formatDescription")}
      title={t("features.playground.animatedCounter.formatTitle")}
    >
      <DemoStage>
        <AnimatedCounter
          className="text-4xl font-bold"
          decimals={2}
          grouping={grouping}
          prefix={<span className="mr-1 text-2xl text-muted">¥</span>}
          value={price}
        />
      </DemoStage>
    </DemoSection>
  );
}

/** 里程表 / 余额：padStart 补零、负数符号与方向感知（跌落时滚轮反向）。 */
function OdometerSection() {
  const { t } = useTranslation();
  const [odometer, setOdometer] = useState(ODOMETER_INITIAL);
  const [balance, setBalance] = useState(BALANCE_INITIAL);
  const [padded, setPadded] = useState(true);

  return (
    <DemoSection
      controls={
        <>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setOdometer((current) => current + 1)}
          >
            <Plus className="size-4" />
            {t("features.playground.animatedCounter.odometerTick")}
          </Button>
          <DemoSwitch
            isSelected={padded}
            label={t("features.playground.animatedCounter.padStart")}
            onChange={setPadded}
          />
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setBalance((current) => current - 175)}
          >
            <Minus className="size-4" />
            {t("features.playground.animatedCounter.spend")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setBalance((current) => current + 300)}
          >
            <Plus className="size-4" />
            {t("features.playground.animatedCounter.earn")}
          </Button>
        </>
      }
      description={t("features.playground.animatedCounter.odometerDescription")}
      title={t("features.playground.animatedCounter.odometerTitle")}
    >
      <DemoStage className="gap-10">
        <div className="flex flex-col items-center gap-1">
          <AnimatedCounter
            className="rounded-2xl bg-foreground px-4 py-1 font-mono text-4xl font-bold text-background"
            padStart={padded ? 6 : 1}
            separator=""
            value={odometer}
          />
          <span className="text-sm text-muted">
            {t("features.playground.animatedCounter.odometerLabel")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <AnimatedCounter
            className={
              balance < 0
                ? "text-4xl font-bold text-danger"
                : "text-4xl font-bold text-success"
            }
            decimals={2}
            prefix="$"
            value={balance}
          />
          <span className="text-sm text-muted">
            {t("features.playground.animatedCounter.balanceLabel")}
          </span>
        </div>
      </DemoStage>
    </DemoSection>
  );
}

/**
 * 演示场 › 数字动画 › Animated Counter：rare-ui `animated-counter`（motion 滚轮数字）。
 * 基础计数 / 格式化（小数 · 前缀 · 分组）/ 里程表与余额（补零 · 负数 · 方向感知）。
 */
export function AnimatedCounterPage() {
  return (
    <PlaygroundPage meta={animatedCounterMeta}>
      <BasicSection />
      <FormatSection />
      <OdometerSection />
    </PlaygroundPage>
  );
}
