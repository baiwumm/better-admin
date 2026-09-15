"use client";

import type { MatrixOrbState } from "./matrix-orb";

import { useState } from "react";

import {
  DemoControl,
  DemoSection,
  DemoStage,
  PlaygroundPage,
} from "../demo-section";
import {
  DemoColorSwatchPicker,
  DemoSegmented,
  DemoSlider,
  DemoSwitch,
} from "../demo-controls";
import { DEMO_ACCENTS } from "../demo-palette";

import MatrixOrb from "./matrix-orb";
import { matrixOrbMeta } from "./meta";

import { useTranslation } from "@/i18n";

const ORB_STATES: MatrixOrbState[] = ["idle", "listening", "thinking"];

/**
 * 演示场 › Ai Kit › Matrix Orb：rare-ui `matrix-orb`（Canvas 2D 点阵光球，零依赖）。
 * idle / listening / thinking 三态平滑混合；listening 振幅可自动包络或手动驱动（对应真实语音电平）。
 * RAF 循环在 effect 内、cleanup 取消：keepAlive 切走即暂停。
 */
export function MatrixOrbPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<MatrixOrbState>("idle");
  const [autoLevel, setAutoLevel] = useState(true);
  const [level, setLevel] = useState(0.6);
  const [dots, setDots] = useState(11);
  const [color, setColor] = useState<string>(DEMO_ACCENTS[1]);

  const labels: Record<MatrixOrbState, string> = {
    idle: t("features.playground.matrixOrb.state.idle"),
    listening: t("features.playground.matrixOrb.state.listening"),
    thinking: t("features.playground.matrixOrb.state.thinking"),
  };

  return (
    <PlaygroundPage meta={matrixOrbMeta}>
      <DemoSection
        controls={
          <>
            <DemoControl label={t("features.playground.matrixOrb.stateLabel")}>
              <DemoSegmented<MatrixOrbState>
                label={t("features.playground.matrixOrb.stateLabel")}
                options={ORB_STATES.map((id) => ({ id, label: labels[id] }))}
                value={state}
                onChange={setState}
              />
            </DemoControl>
            <DemoSwitch
              isSelected={autoLevel}
              label={t("features.playground.matrixOrb.autoLevel")}
              onChange={setAutoLevel}
            />
            {!autoLevel ? (
              <DemoControl label={t("features.playground.matrixOrb.level")}>
                <DemoSlider
                  formatOptions={{ style: "percent" }}
                  label={t("features.playground.matrixOrb.level")}
                  maxValue={1}
                  minValue={0}
                  step={0.05}
                  value={level}
                  onChange={setLevel}
                />
              </DemoControl>
            ) : null}
            <DemoControl label={t("features.playground.matrixOrb.dots")}>
              <DemoSlider
                className="w-36"
                label={t("features.playground.matrixOrb.dots")}
                maxValue={17}
                minValue={5}
                step={2}
                value={dots}
                onChange={setDots}
              />
            </DemoControl>
            <DemoControl label={t("features.playground.common.color")}>
              <DemoColorSwatchPicker
                colors={DEMO_ACCENTS}
                label={t("features.playground.common.color")}
                value={color}
                onChange={setColor}
              />
            </DemoControl>
          </>
        }
        description={t("features.playground.matrixOrb.stageDescription")}
        title={t("features.playground.matrixOrb.stageTitle")}
      >
        <DemoStage className="min-h-80">
          <MatrixOrb
            color={color}
            dots={dots}
            labels={labels}
            level={autoLevel ? undefined : level}
            size={240}
            state={state}
          />
        </DemoStage>
      </DemoSection>

      <DemoSection
        description={t("features.playground.matrixOrb.trioDescription")}
        title={t("features.playground.matrixOrb.trioTitle")}
      >
        <DemoStage className="gap-10">
          {ORB_STATES.map((orbState) => (
            <MatrixOrb
              key={orbState}
              color={color}
              labels={labels}
              size={140}
              state={orbState}
            />
          ))}
        </DemoStage>
      </DemoSection>
    </PlaygroundPage>
  );
}
