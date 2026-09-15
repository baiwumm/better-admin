import { Button, Chip } from "@heroui/react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { DemoControl, DemoSection, PlaygroundPage } from "../demo-section";
import { DemoSegmented, DemoSlider } from "../demo-controls";

import { generateArtworkDataUrl } from "./artwork";
import { GridReveal } from "./grid-reveal";
import { gridRevealMeta } from "./meta";

import { useTranslation } from "@/i18n";

type AspectKey = "1:1" | "4:3" | "16:9";
type Phase = "idle" | "generating" | "done";

const ASPECTS: Record<AspectKey, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
};

/** 模拟生成的进度步长（ms）。 */
const TICK_MS = 80;

/**
 * 模拟 AI 出图：点击后进度 0 → 1 驱动网格拆分，进度满即「图片到达」（本地 canvas 生成 data URL），
 * GridReveal 以图片落地为完成信号做最终揭示；idle 态不传 progress，组件自走等待动画。
 */
function GenerateSection() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seed, setSeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [aspect, setAspect] = useState<AspectKey>("4:3");
  const [durationSec, setDurationSec] = useState(4);

  // 每 tick 重排 setTimeout（依赖 progress）：进度满时在回调内一次性切换到 done，updater 保持纯函数
  useEffect(() => {
    if (phase !== "generating") return;
    const timer = setTimeout(() => {
      const next = Math.min(1, progress + TICK_MS / (durationSec * 1000));

      setProgress(next);
      if (next >= 1) {
        setSrc(generateArtworkDataUrl(seed));
        setPhase("done");
      }
    }, TICK_MS);

    return () => clearTimeout(timer);
  }, [phase, progress, durationSec, seed]);

  const generate = () => {
    setSeed((current) => current + 1);
    setSrc(null);
    setRevealed(false);
    setProgress(0);
    setPhase("generating");
  };

  const generating = phase === "generating";
  const caption = generating
    ? t("features.playground.gridReveal.captionGenerating", {
        percent: Math.round(progress * 100),
      })
    : phase === "done"
      ? t("features.playground.gridReveal.captionDone")
      : t("features.playground.gridReveal.captionIdle");

  return (
    <DemoSection
      controls={
        <>
          <Button isDisabled={generating} size="sm" onPress={generate}>
            {phase === "idle" ? (
              <Sparkles className="size-4" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {t(
              phase === "idle"
                ? "features.playground.gridReveal.generate"
                : "features.playground.gridReveal.regenerate",
            )}
          </Button>
          <DemoControl label={t("features.playground.gridReveal.aspect")}>
            <DemoSegmented<AspectKey>
              label={t("features.playground.gridReveal.aspect")}
              options={(Object.keys(ASPECTS) as AspectKey[]).map((id) => ({
                id,
                label: id,
              }))}
              value={aspect}
              onChange={setAspect}
            />
          </DemoControl>
          <DemoControl label={t("features.playground.common.duration")}>
            <DemoSlider
              formatOptions={{ style: "unit", unit: "second" }}
              label={t("features.playground.common.duration")}
              maxValue={10}
              minValue={2}
              value={durationSec}
              onChange={setDurationSec}
            />
          </DemoControl>
          {revealed ? (
            <Chip color="success" size="sm" variant="soft">
              {t("features.playground.gridReveal.revealed")}
            </Chip>
          ) : null}
        </>
      }
      description={t("features.playground.gridReveal.generateDescription")}
      title={t("features.playground.gridReveal.generateTitle")}
    >
      <div className="mx-auto w-full max-w-xl">
        <GridReveal
          alt={t("features.playground.gridReveal.alt")}
          aspect={ASPECTS[aspect]}
          caption={caption}
          estimatedDuration={durationSec * 1000}
          progress={generating ? progress : undefined}
          src={src}
          onRevealComplete={() => setRevealed(true)}
        />
      </div>
    </DemoSection>
  );
}

/** 受控进度：滑块直接驱动 `progress`，不传图片，纯看网格拆分的节奏（上限 0.9 留给图片落地）。 */
function ControlledSection() {
  const { t } = useTranslation();
  const [percent, setPercent] = useState(30);

  return (
    <DemoSection
      controls={
        <DemoControl label={t("features.playground.gridReveal.progress")}>
          <DemoSlider
            className="w-64"
            label={t("features.playground.gridReveal.progress")}
            maxValue={100}
            minValue={0}
            value={percent}
            onChange={setPercent}
          />
        </DemoControl>
      }
      description={t("features.playground.gridReveal.controlledDescription")}
      title={t("features.playground.gridReveal.controlledTitle")}
    >
      <div className="mx-auto w-full max-w-md">
        <GridReveal aspect={16 / 9} progress={percent / 100} src={null} />
      </div>
    </DemoSection>
  );
}

/**
 * 演示场 › Ai Kit › Grid Reveal：rare-ui `grid-reveal`（canvas 二分网格 + 图片均色揭示，motion 做说明条动画）。
 * 模拟生成（进度驱动 + 本地 canvas 出图）/ 受控进度（滑块）。演示图完全本地生成，无外链依赖。
 */
export function GridRevealPage() {
  return (
    <PlaygroundPage meta={gridRevealMeta}>
      <GenerateSection />
      <ControlledSection />
    </PlaygroundPage>
  );
}
