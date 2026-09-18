import type { StatsSeriesPoint } from "@/lib/api-types";
import type { ReactNode } from "react";

import { Card } from "@heroui/react";
import NumberFlow from "@number-flow/react";

/**
 * KPI 统计卡（HeroUI Pro 风格 + 迷你趋势图）：左侧标题 + 大号数字
 * （NumberFlow 滚动，tabular-nums）+ 右上状态 badge；右侧近 7 日迷你
 * 渐变折线（内联 SVG，7 点序列不依赖 recharts 异步 chunk）。
 * 视觉全部复用项目级 Design Tokens（badge 用语义色浅底），无新色值。
 */

export type KpiBadgeTone = "up" | "down" | "accent" | "neutral";

interface KpiCardProps {
  label: string;
  value: number;
  /** 右上角状态 badge（环比 / 今日增量等；缺省不展示） */
  badge?: ReactNode;
  /** badge 色调（up=涨 / down=跌 / accent=主色浅底 / neutral=中性） */
  badgeTone?: KpiBadgeTone;
  /** 近 7 日序列（右侧迷你折线数据；缺省不渲染图区，如组织规模卡） */
  series?: StatsSeriesPoint[];
}

/** badge 色调 → 语义色 token（12% 浅底 + 语义色文字，无新色值） */
const BADGE_TONE_STYLE: Record<
  KpiBadgeTone,
  { color: string; background: string }
> = {
  up: {
    color: "var(--success)",
    background: "color-mix(in oklch, var(--success) 12%, transparent)",
  },
  down: {
    color: "var(--danger)",
    background: "color-mix(in oklch, var(--danger) 12%, transparent)",
  },
  accent: {
    color: "var(--accent)",
    background: "color-mix(in oklch, var(--accent) 12%, transparent)",
  },
  neutral: { color: "var(--default-foreground)", background: "var(--default)" },
};

/** 7 点序列 → 迷你折线 path（y 轴按 min/max 归一，max=min 时拉平中线） */
function buildSparklinePath(series: StatsSeriesPoint[]): {
  line: string;
  area: string;
} {
  const width = 100;
  const height = 40;
  const values = series.map((p) => p.count);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - 2 - ((v - min) / span) * (height - 4);

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${points.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return { line, area };
}

/** 卡片实例自增序号 → 渐变 id（SVG defs 全局作用域，避免多卡同 id 冲突） */
let sparklineSeq = 0;

export function KpiCard({
  label,
  value,
  badge,
  badgeTone = "neutral",
  series,
}: KpiCardProps) {
  const sparkline = series ? buildSparklinePath(series) : null;
  // 模块级自增序号保证唯一；组件不重挂载则 id 稳定，重挂载生成新 id 亦无冲突
  const gradientId = `kpi-spark-${(sparklineSeq += 1)}`;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <Card.Content className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm" style={{ color: "var(--muted)" }}>
              {label}
            </p>
            {badge ? (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
                style={BADGE_TONE_STYLE[badgeTone]}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <NumberFlow
            className="text-3xl font-semibold tabular-nums"
            style={{ color: "var(--foreground)" }}
            value={value}
          />
        </div>
        {sparkline ? (
          <svg
            aria-hidden
            className="h-12 w-20 shrink-0"
            preserveAspectRatio="none"
            viewBox="0 0 100 40"
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
            <path d={sparkline.area} fill={`url(#${gradientId})`} />
            <path
              d={sparkline.line}
              fill="none"
              stroke="var(--accent)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        ) : null}
      </Card.Content>
    </Card>
  );
}
