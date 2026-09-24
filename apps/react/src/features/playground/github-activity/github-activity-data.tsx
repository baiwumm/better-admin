import type {
  Contribution,
  ContributionLevel,
  RepoContribution,
} from "./github-activity";

import { REPO_URL } from "../constants";

import { githubUrl } from "@/lib/env";

/** 确定性伪随机（mulberry32）：同 seed 产出完全一致的热力图，四端对比稳定。 */
function mulberry32(seed: number) {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toLevel(count: number): ContributionLevel {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;

  return 4;
}

/** 本地日期 → `YYYY-MM-DD`（不走 toISOString，避免 UTC 偏移串天）。 */
function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/**
 * 生成截止今天、起始对齐周日的贡献序列（与组件 fetchCalendar 的「列 = 周、首日周日」口径一致）。
 * 工作日活跃、周末稀疏，并叠加几段「冲刺期」与「休假期」让分布更像真人。
 */
export function buildContributions(
  weeks = 53,
  seed = 20260915,
): Contribution[] {
  const rand = mulberry32(seed);
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);

  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - start.getDay());

  const totalDays =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  // 冲刺 / 休假区间：按天索引标记活跃度倍率
  const multiplier = new Array<number>(totalDays).fill(1);
  const phases = 5 + Math.floor(rand() * 3);

  for (let i = 0; i < phases; i++) {
    const at = Math.floor(rand() * totalDays);
    const span = 5 + Math.floor(rand() * 14);
    const factor = rand() > 0.4 ? 2.2 : 0.15;

    for (let d = at; d < Math.min(totalDays, at + span); d++)
      multiplier[d] = factor;
  }

  const days: Contribution[] = [];
  const cursor = new Date(start);

  for (let i = 0; i < totalDays; i++) {
    const weekday = cursor.getDay();
    const weekend = weekday === 0 || weekday === 6;
    const base = weekend ? 0.9 : 4.2;
    const noise = rand() * rand() * 9;
    const raw = (base + noise) * multiplier[i] * (rand() > 0.12 ? 1 : 0);
    const count = Math.round(raw);

    days.push({ date: toDateKey(cursor), count, level: toLevel(count) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * 静态仓库榜（演示计数，不请求 GitHub API）。
 * logo 为本地静态资源（`public/playground/`），均为自带底色的方章 / 圆形图标，亮暗主题共用一份。
 */
export const DEMO_REPOS: RepoContribution[] = [
  {
    name: "better-admin",
    count: 486,
    href: REPO_URL,
    logo: <img alt="" src="/logo.png" />,
  },
  {
    name: "theme-switch-animation",
    count: 132,
    href: githubUrl("theme-switch-animation"),
    logo: <img alt="" src="/playground/theme-switch-animation.svg" />,
  },
  {
    name: "next-daily-hot",
    count: 57,
    href: githubUrl("next-daily-hot"),
    logo: <img alt="" src="/playground/next-daily-hot.png" />,
  },
];

/** GitHub 官方五档绿（浅色）：演示 `accent` 传色阶数组的形态。 */
export const GITHUB_SCALE = [
  "#ebedf0",
  "#9be9a8",
  "#40c463",
  "#30a14e",
  "#216e39",
] as const;
