"use client";

import type { Contribution } from "./github-activity";

import { useMemo, useState } from "react";

import { DemoControl, DemoSection, PlaygroundPage } from "../demo-section";
import { DemoSegmented, DemoSwitch } from "../demo-controls";
import { DEMO_ACCENTS } from "../demo-palette";

import { GitHubActivity } from "./github-activity";
import {
  DEMO_REPOS,
  GITHUB_SCALE,
  buildContributions,
} from "./github-activity-data";
import { githubActivityMeta } from "./meta";

import { useTranslation } from "@/i18n";

type Months = "3" | "6" | "12";
type CellSize = "9" | "11" | "13";
type AccentKey = "green" | "blue" | "purple" | "scale";

const ACCENTS: Record<AccentKey, string | string[]> = {
  green: "#39d353",
  blue: DEMO_ACCENTS[0],
  purple: DEMO_ACCENTS[3],
  scale: [...GITHUB_SCALE],
};

/**
 * 演示场 › GitHub Activity：rare-ui `github-activity`（贡献热力图 + 仓库榜折叠面板，motion 布局动画）。
 * 数据为本地确定性生成（seed 固定）+ 静态仓库榜，经 props 注入，不请求 GitHub API。
 */
export function GitHubActivityPage() {
  const { t, i18n } = useTranslation();
  const [months, setMonths] = useState<Months>("12");
  const [cellSize, setCellSize] = useState<CellSize>("11");
  const [accent, setAccent] = useState<AccentKey>("green");
  const [showMonths, setShowMonths] = useState(true);
  const [contributions] = useState(() => buildContributions());

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }),
    [i18n.language],
  );

  const formatDay = (day: Contribution) =>
    t("features.playground.githubActivity.day", {
      count: day.count,
      date: dateFormat.format(new Date(`${day.date}T00:00:00`)),
    });

  return (
    <PlaygroundPage meta={githubActivityMeta}>
      <DemoSection
        controls={
          <>
            <DemoControl label={t("features.playground.githubActivity.months")}>
              <DemoSegmented<Months>
                label={t("features.playground.githubActivity.months")}
                options={(["3", "6", "12"] as Months[]).map((id) => ({
                  id,
                  label: id,
                }))}
                value={months}
                onChange={setMonths}
              />
            </DemoControl>
            <DemoControl
              label={t("features.playground.githubActivity.cellSize")}
            >
              <DemoSegmented<CellSize>
                label={t("features.playground.githubActivity.cellSize")}
                options={(["9", "11", "13"] as CellSize[]).map((id) => ({
                  id,
                  label: `${id}px`,
                }))}
                value={cellSize}
                onChange={setCellSize}
              />
            </DemoControl>
            <DemoControl label={t("features.playground.githubActivity.accent")}>
              <DemoSegmented<AccentKey>
                label={t("features.playground.githubActivity.accent")}
                options={(Object.keys(ACCENTS) as AccentKey[]).map((id) => ({
                  id,
                  label: t(`features.playground.githubActivity.accent.${id}`),
                }))}
                value={accent}
                onChange={setAccent}
              />
            </DemoControl>
            <DemoSwitch
              isSelected={showMonths}
              label={t("features.playground.githubActivity.showMonths")}
              onChange={setShowMonths}
            />
          </>
        }
        description={t("features.playground.githubActivity.heatmapDescription")}
        title={t("features.playground.githubActivity.heatmapTitle")}
      >
        <div className="flex justify-center overflow-x-auto py-2">
          <GitHubActivity
            accent={ACCENTS[accent]}
            cellSize={Number(cellSize)}
            className="border border-border"
            contributions={contributions}
            formatDay={formatDay}
            formatHeading={(total, year) =>
              t("features.playground.githubActivity.heading", {
                count: total,
                year: year ?? "",
              })
            }
            label={t("features.playground.githubActivity.topLabel")}
            months={Number(months)}
            repos={DEMO_REPOS}
            showMonths={showMonths}
            toggleLabels={{
              show: t("features.playground.githubActivity.showRepos"),
              hide: t("features.playground.githubActivity.hideRepos"),
            }}
          />
        </div>
      </DemoSection>
    </PlaygroundPage>
  );
}
