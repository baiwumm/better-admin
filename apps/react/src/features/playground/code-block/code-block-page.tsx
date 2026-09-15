import type { CodeSampleLanguage } from "./code-samples";

import { Typography } from "@heroui/react";
import { useState } from "react";

import { DemoControl, DemoSection, PlaygroundPage } from "../demo-section";
import { ColorSwatches, DemoSegmented, DemoSwitch } from "../demo-controls";
import { DEMO_ACCENTS } from "../demo-palette";

import { CodeBlock } from "./code-block";
import { CODE_SAMPLES, CODE_SAMPLE_LANGUAGES } from "./code-samples";
import { codeBlockMeta } from "./meta";

import { useTranslation } from "@/i18n";

type ThemeMode = "auto" | "light" | "dark";

const THEME_MODES: ThemeMode[] = ["auto", "light", "dark"];

/** 主题色派生区固定展示的语言（短、彩色 token 多，最能体现派生效果）。 */
const ACCENT_SAMPLE = CODE_SAMPLES.css;

/** 无边框嵌入区的行内示例。 */
const INLINE_SAMPLE = `pnpm --filter better-admin-react add -E motion prism-react-renderer`;

/**
 * 演示场 › 代码块：rare-ui `code-block`（prism-react-renderer 高亮 + motion 复制反馈）。
 * 三个区块：多语言高亮（语言 / 主题模式 / 行号 / 高亮行）、主题色派生（单一 hex 派生整套主题）、
 * 无边框嵌入（浮动复制按钮）。全部为前端本地状态，无写库副作用。
 */
export function CodeBlockPage() {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<CodeSampleLanguage>("tsx");
  const [mode, setMode] = useState<ThemeMode>("auto");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [highlight, setHighlight] = useState(false);
  const [accent, setAccent] = useState<string>(DEMO_ACCENTS[0]);

  const sample = CODE_SAMPLES[language];

  return (
    <PlaygroundPage meta={codeBlockMeta}>
      <DemoSection
        controls={
          <>
            <DemoControl label={t("features.playground.codeBlock.language")}>
              <DemoSegmented
                label={t("features.playground.codeBlock.language")}
                options={CODE_SAMPLE_LANGUAGES.map((id) => ({ id, label: id }))}
                value={language}
                onChange={setLanguage}
              />
            </DemoControl>
            <DemoControl label={t("features.playground.codeBlock.mode")}>
              <DemoSegmented
                label={t("features.playground.codeBlock.mode")}
                options={THEME_MODES.map((id) => ({
                  id,
                  label: t(`features.playground.codeBlock.mode.${id}`),
                }))}
                value={mode}
                onChange={setMode}
              />
            </DemoControl>
            <DemoSwitch
              isSelected={showLineNumbers}
              label={t("features.playground.codeBlock.lineNumbers")}
              onChange={setShowLineNumbers}
            />
            <DemoSwitch
              isSelected={highlight}
              label={t("features.playground.codeBlock.highlightLines")}
              onChange={setHighlight}
            />
          </>
        }
        description={t("features.playground.codeBlock.languagesDescription")}
        title={t("features.playground.codeBlock.languagesTitle")}
      >
        <CodeBlock
          accent={accent}
          code={sample.code}
          filename={sample.filename}
          highlightLines={highlight ? [2, 3, 4] : undefined}
          language={language}
          mode={mode}
          showLineNumbers={showLineNumbers}
        />
      </DemoSection>

      <DemoSection
        controls={
          <DemoControl label={t("features.playground.codeBlock.accent")}>
            <ColorSwatches
              colors={DEMO_ACCENTS}
              label={t("features.playground.codeBlock.accent")}
              value={accent}
              onChange={setAccent}
            />
          </DemoControl>
        }
        description={t("features.playground.codeBlock.accentDescription")}
        title={t("features.playground.codeBlock.accentTitle")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeBlock
            accent={accent}
            code={ACCENT_SAMPLE.code}
            filename={`${ACCENT_SAMPLE.filename} · light`}
            language="css"
            mode="light"
            showCopyButton={false}
          />
          <CodeBlock
            accent={accent}
            code={ACCENT_SAMPLE.code}
            filename={`${ACCENT_SAMPLE.filename} · dark`}
            language="css"
            mode="dark"
            showCopyButton={false}
          />
        </div>
      </DemoSection>

      <DemoSection
        description={t("features.playground.codeBlock.inlineDescription")}
        title={t("features.playground.codeBlock.inlineTitle")}
      >
        <Typography type="body-sm">
          {t("features.playground.codeBlock.inlineLead")}
        </Typography>
        <div className="rounded-3xl border border-border bg-default/40 p-3">
          {/* 单行代码的容器高度不足以容纳浮动复制按钮（overflow-hidden 会裁切）：给最小高度并预留右侧空间 */}
          <CodeBlock
            accent={accent}
            className="min-h-12 justify-center pr-12"
            code={INLINE_SAMPLE}
            language="bash"
            showFrame={false}
            showLineNumbers={false}
          />
        </div>
      </DemoSection>
    </PlaygroundPage>
  );
}
