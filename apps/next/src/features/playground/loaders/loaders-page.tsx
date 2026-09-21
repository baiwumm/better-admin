"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

import {
  DemoControl,
  DemoSection,
  DemoStage,
  PlaygroundPage,
} from "../demo-section";
import { DemoSlider } from "../demo-controls";

import { loadersMeta } from "./meta";
import { Loader, type LoaderVariant } from "./loader";

import { useTranslation } from "@/i18n";

/** 全部 17 种变体（与 LoaderVariant 联合类型一一对应，编译期防漂移）。 */
const LOADER_VARIANTS = [
  "spinner",
  "dots",
  "bars",
  "dot-matrix",
  "dither",
  "morph",
  "comet",
  "scramble",
  "metaballs",
  "newton",
  "helix",
  "percent",
  "ascii",
  "ascii-line",
  "ascii-braille",
  "ascii-blocks",
  "ascii-bounce",
] as const satisfies readonly LoaderVariant[];

const SIZE_RANGE = { min: 16, max: 96, step: 4 };
const SPEED_RANGE = { min: 0.25, max: 3, step: 0.25 };

/** 变体名是技术专名，保留英文不译（与主题切换动画页的处理一致）。 */
function VariantCard({
  size,
  speed,
  variant,
}: {
  size: number;
  speed: number;
  variant: LoaderVariant;
}) {
  return (
    // 高度不写死：随 size 撑开（size=96 时 ASCII 字形 / percent 进度条均需大于
    // 固定行高的空间），grid 行内各卡等高对齐，矮内容垂直居中。
    <div className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-default/40 p-6">
      {/* motion 对循环中的动画不应用新的 transition，speed 变化须重挂载重启 */}
      <Loader key={speed} size={size} speed={speed} variant={variant} />
      <span className="font-mono text-xs">{variant}</span>
    </div>
  );
}

/** 区块一：17 种变体全员展示墙，滑块统一调节尺寸与周期时长。 */
function VariantGridSection({
  size,
  speed,
  onSizeChange,
  onSpeedChange,
}: {
  size: number;
  speed: number;
  onSizeChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <DemoSection
      controls={
        <>
          <DemoControl label={t("features.playground.common.size")}>
            <DemoSlider
              label={t("features.playground.common.size")}
              maxValue={SIZE_RANGE.max}
              minValue={SIZE_RANGE.min}
              step={SIZE_RANGE.step}
              value={size}
              onChange={onSizeChange}
            />
          </DemoControl>
          <DemoControl label={t("features.playground.common.duration")}>
            <DemoSlider
              formatOptions={{ style: "unit", unit: "second" }}
              label={t("features.playground.common.duration")}
              maxValue={SPEED_RANGE.max}
              minValue={SPEED_RANGE.min}
              step={SPEED_RANGE.step}
              value={speed}
              onChange={onSpeedChange}
            />
          </DemoControl>
        </>
      }
      description={t("features.playground.loaders.variantsDescription")}
      title={t("features.playground.loaders.variantsTitle")}
    >
      {/* 5 列给 percent（宽度 size*1.4）留足余量，6 列在 size=96 时会横向溢出 */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {LOADER_VARIANTS.map((variant) => (
          <VariantCard
            key={variant}
            size={size}
            speed={speed}
            variant={variant}
          />
        ))}
      </div>
    </DemoSection>
  );
}

/** 区块二：选中一种变体并调节尺寸 / 周期时长，中央大号实时预览。 */
function ParamsSection({
  size,
  speed,
  variant,
  onSizeChange,
  onSpeedChange,
  onVariantChange,
}: {
  size: number;
  speed: number;
  variant: LoaderVariant;
  onSizeChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onVariantChange: (value: LoaderVariant) => void;
}) {
  const { t } = useTranslation();

  return (
    <DemoSection
      controls={
        <>
          <DemoControl label={t("features.playground.common.size")}>
            <DemoSlider
              label={t("features.playground.common.size")}
              maxValue={SIZE_RANGE.max}
              minValue={SIZE_RANGE.min}
              step={SIZE_RANGE.step}
              value={size}
              onChange={onSizeChange}
            />
          </DemoControl>
          <DemoControl label={t("features.playground.common.duration")}>
            <DemoSlider
              formatOptions={{ style: "unit", unit: "second" }}
              label={t("features.playground.common.duration")}
              maxValue={SPEED_RANGE.max}
              minValue={SPEED_RANGE.min}
              step={SPEED_RANGE.step}
              value={speed}
              onChange={onSpeedChange}
            />
          </DemoControl>
        </>
      }
      description={t("features.playground.loaders.paramsDescription")}
      title={t("features.playground.loaders.paramsTitle")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            {t("features.playground.loaders.variant")}
          </span>
          <div className="flex flex-wrap gap-2">
            {LOADER_VARIANTS.map((item) => (
              <Button
                key={item}
                aria-label={item}
                className="font-mono text-xs"
                size="sm"
                variant={item === variant ? "primary" : "outline"}
                onPress={() => onVariantChange(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
        <DemoStage className="min-h-52">
          <Loader key={speed} size={size} speed={speed} variant={variant} />
        </DemoStage>
      </div>
    </DemoSection>
  );
}

/**
 * 演示场 › 加载动画：beUI `loader`（motion 关键帧动画，单组件 17 种变体）。
 * 组件 vendor 自 beUI registry（MIT），两区块共享尺寸 / 时长参数，实时联动。
 */
export function LoadersPage() {
  const [size, setSize] = useState(36);
  const [speed, setSpeed] = useState(1);
  const [variant, setVariant] = useState<LoaderVariant>("spinner");

  return (
    <PlaygroundPage meta={loadersMeta}>
      <VariantGridSection
        size={size}
        speed={speed}
        onSizeChange={setSize}
        onSpeedChange={setSpeed}
      />
      <ParamsSection
        size={size}
        speed={speed}
        variant={variant}
        onSizeChange={setSize}
        onSpeedChange={setSpeed}
        onVariantChange={setVariant}
      />
    </PlaygroundPage>
  );
}
