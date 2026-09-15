"use client";

import { useState } from "react";

import {
  DemoControl,
  DemoSection,
  DemoStage,
  PlaygroundPage,
} from "../demo-section";
import { DemoColorSwatchPicker, DemoSegmented } from "../demo-controls";
import { DEMO_ACCENTS } from "../demo-palette";

import FluidOrb from "./fluid-orb";
import { fluidOrbMeta } from "./meta";

import { useTranslation } from "@/i18n";

type OrbSize = "sm" | "md" | "lg";

/** 尺寸用分段而非滑块：size 变更会重建着色器程序，拖拽连续触发没有意义。 */
const ORB_SIZES: Record<OrbSize, number> = { sm: 160, md: 240, lg: 320 };

/** 多色组合区固定展示的三枚小球。 */
const ORB_TRIO = [DEMO_ACCENTS[0], DEMO_ACCENTS[1], DEMO_ACCENTS[3]] as const;

/**
 * 演示场 › Ai Kit › Fluid Orb：rare-ui `fluid-orb`（原生 WebGL 片元着色器 fbm 噪声流体，零依赖）。
 * RAF 循环在 effect 内、cleanup 取消：keepAlive（Activity hidden）切走即暂停，切回重建。
 */
export function FluidOrbPage() {
  const { t } = useTranslation();
  const [color, setColor] = useState<string>(DEMO_ACCENTS[0]);
  const [size, setSize] = useState<OrbSize>("md");

  return (
    <PlaygroundPage meta={fluidOrbMeta}>
      <DemoSection
        controls={
          <>
            <DemoControl label={t("features.playground.common.color")}>
              <DemoColorSwatchPicker
                colors={DEMO_ACCENTS}
                label={t("features.playground.common.color")}
                value={color}
                onChange={setColor}
              />
            </DemoControl>
            <DemoControl label={t("features.playground.common.size")}>
              <DemoSegmented<OrbSize>
                label={t("features.playground.common.size")}
                options={[
                  { id: "sm", label: "S" },
                  { id: "md", label: "M" },
                  { id: "lg", label: "L" },
                ]}
                value={size}
                onChange={setSize}
              />
            </DemoControl>
          </>
        }
        description={t("features.playground.fluidOrb.singleDescription")}
        title={t("features.playground.fluidOrb.singleTitle")}
      >
        <DemoStage className="min-h-96">
          <FluidOrb color={color} size={ORB_SIZES[size]} />
        </DemoStage>
        <p className="text-xs text-muted">
          {t("features.playground.fluidOrb.webglNote")}
        </p>
      </DemoSection>

      <DemoSection
        description={t("features.playground.fluidOrb.trioDescription")}
        title={t("features.playground.fluidOrb.trioTitle")}
      >
        <DemoStage className="gap-10">
          {ORB_TRIO.map((hex) => (
            <FluidOrb key={hex} color={hex} size={128} />
          ))}
        </DemoStage>
      </DemoSection>
    </PlaygroundPage>
  );
}
