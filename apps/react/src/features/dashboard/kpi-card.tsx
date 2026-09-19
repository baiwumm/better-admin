import type { StatsSeriesPoint } from "@/lib/api-types";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, Chip } from "@heroui/react";
import NumberFlow from "@number-flow/react";

/**
 * KPI 统计卡（plan §4.1 视觉语言 1）：Card.Header = 左上角图标徽标 + 标题（左）
 * + 状态 Chip（右）；Card.Content = 大号数字（NumberFlow 滚动）+ **底部通栏**
 * 迷你 sparkline（内联 SVG + Catmull-Rom 平滑曲线，不依赖 recharts 异步 chunk）。
 *
 * sparkline 用 `preserveAspectRatio="none"` 铺满卡宽，因此描边必须带
 * `vector-effect="non-scaling-stroke"`——否则非等比缩放会让线宽随方向变化
 * （横段粗、竖段细），曲线也被压平看不出起伏。
 * 无 series 的卡（组织规模）不留空带，改由数字在内容区垂直居中补齐高度。
 */

export type KpiBadgeTone = "up" | "down" | "accent" | "neutral";

interface KpiCardProps {
  label: string;
  value: number;
  /** 左上角图标徽标（主色 10% 底 + 主色图标） */
  icon: LucideIcon;
  /** 状态文案（环比 / 今日增量等；缺省不展示） */
  badge?: ReactNode;
  /** badge 色调（up=涨 / down=跌 / accent=主色 / neutral=中性） */
  badgeTone?: KpiBadgeTone;
  /** 近 7 日序列（底部迷你折线数据；缺省时数字在内容区垂直居中） */
  series?: StatsSeriesPoint[];
}

/** badge 色调 → HeroUI Chip color */
const BADGE_TONE_COLOR: Record<
  KpiBadgeTone,
  "accent" | "danger" | "default" | "success"
> = {
  up: "success",
  down: "danger",
  accent: "accent",
  neutral: "default",
};

/** sparkline 内部坐标系高度（viewBox 单位；与归一化取值范围配套） */
const SPARK_HEIGHT = 40;
const SPARK_WIDTH = 100;

/** 7 点序列点坐标（y 轴按 min/max 归一，max=min 时拉平中线） */
function seriesPoints(series: StatsSeriesPoint[]): { x: number; y: number }[] {
  const values = series.map((p) => p.count);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX =
    values.length > 1 ? SPARK_WIDTH / (values.length - 1) : SPARK_WIDTH;

  return values.map((v, i) => ({
    x: i * stepX,
    y: SPARK_HEIGHT - 2 - ((v - min) / span) * (SPARK_HEIGHT - 4),
  }));
}

/** Catmull-Rom → 三次贝塞尔平滑折线（相邻点切手中点控制，视觉光滑无过冲） */
function smoothLinePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const at = (i: number) => points[Math.min(Math.max(i, 0), points.length - 1)];
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return d;
}

/** 卡片实例自增序号 → 渐变 id（SVG defs 全局作用域，避免多卡同 id 冲突） */
let sparklineSeq = 0;

export function KpiCard({
  label,
  value,
  icon: Icon,
  badge,
  badgeTone = "neutral",
  series,
}: KpiCardProps) {
  const points = series ? seriesPoints(series) : null;
  const linePath = points ? smoothLinePath(points) : "";
  const areaPath = points
    ? `${linePath} L${SPARK_WIDTH},${SPARK_HEIGHT} L0,${SPARK_HEIGHT} Z`
    : "";
  // 模块级自增序号保证唯一；组件不重挂载则 id 稳定，重挂载生成新 id 亦无冲突
  const gradientId = `kpi-spark-${(sparklineSeq += 1)}`;

  return (
    <Card className="dashboard-card">
      <Card.Header className="flex-row items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"
        >
          <Icon className="size-4" />
        </span>
        <Card.Title
          className="min-w-0 flex-1 truncate text-sm font-normal"
          style={{ color: "var(--muted)" }}
        >
          {label}
        </Card.Title>
        {badge ? (
          <Chip color={BADGE_TONE_COLOR[badgeTone]} size="sm" variant="soft">
            {badge}
          </Chip>
        ) : null}
      </Card.Header>
      {/*
        数字一律顶部对齐：四卡同排时大数字必须共用一条基线，
        无 sparkline 的卡（组织规模）宁可留底部空白也不要 justify-center
        把数字推低——错位比留白更显眼。
      */}
      <Card.Content className="gap-2">
        <NumberFlow
          className="text-3xl font-semibold tabular-nums"
          style={{ color: "var(--foreground)" }}
          value={value}
        />
        {linePath ? (
          <svg
            aria-hidden
            className="mt-auto h-8 w-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity="0.25"
                />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeLinecap="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}
      </Card.Content>
    </Card>
  );
}
