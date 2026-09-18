import type { StatsSeriesPoint } from "@/lib/api-types";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, cn } from "@heroui/react";
import NumberFlow from "@number-flow/react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { useTranslation } from "@/i18n";

/**
 * KPI 统计卡（plan §4.1 视觉语言 1）：
 * 左上图标徽标（主色 10% 底）+ 大号数字（NumberFlow 滚动，tabular-nums）+
 * 右上环比 badge（语义色 token）+ 底部迷你 sparkline（内联 SVG 面积图，
 * 7 点序列不依赖 recharts 异步 chunk，首屏即时呈现）。
 */

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  /** 副行内容（如「今日新增 N」） */
  subline?: ReactNode;
  /** 环比昨日百分比（null 不展示；0 展示中性「持平」） */
  deltaPercent?: number | null;
  /** 近 7 日序列（迷你 sparkline 数据，缺省不渲染图区） */
  series?: StatsSeriesPoint[];
}

/** 7 点序列 → 迷你面积图 path（y 轴按 min/max 归一，max=min 时拉平中线） */
function buildSparklinePath(series: StatsSeriesPoint[]): {
  line: string;
  area: string;
} {
  const width = 100;
  const height = 32;
  const values = series.map((p) => p.count);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = i * stepX;
    // max 贴顶、min 贴底，留 2px 余量
    const y = height - 2 - ((v - min) / span) * (height - 4);

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${points.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return { line, area };
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  subline,
  deltaPercent = null,
  series,
}: KpiCardProps) {
  const { t } = useTranslation();
  const sparkline = series ? buildSparklinePath(series) : null;
  // 渐变 id 按序列内容派生，避免多卡同 id 冲突（SVG defs 全局作用域）
  const gradientId = `kpi-spark-${label.replace(/\W/g, "")}`;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <Card.Content className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex size-9 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklch, var(--accent) 10%, transparent)",
            }}
          >
            <Icon
              aria-hidden
              className="size-4.5"
              style={{ color: "var(--accent)" }}
            />
          </div>
          {deltaPercent !== null ? (
            deltaPercent === 0 ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs tabular-nums"
                style={{
                  background: "var(--default)",
                  color: "var(--default-foreground)",
                }}
              >
                {t("features.dashboard.kpi.deltaFlat")}
              </span>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                )}
                style={{
                  color: deltaPercent > 0 ? "var(--success)" : "var(--danger)",
                  background: `color-mix(in oklch, ${deltaPercent > 0 ? "var(--success)" : "var(--danger)"} 12%, transparent)`,
                }}
              >
                {deltaPercent > 0 ? (
                  <TrendingUp aria-hidden className="size-3" />
                ) : (
                  <TrendingDown aria-hidden className="size-3" />
                )}
                {Math.abs(deltaPercent)}%
              </span>
            )
          ) : null}
        </div>
        <div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {label}
          </p>
          <NumberFlow
            className="text-3xl font-semibold tabular-nums"
            style={{ color: "var(--foreground)" }}
            value={value}
          />
        </div>
        {subline ? (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {subline}
          </p>
        ) : null}
        {sparkline ? (
          <svg
            aria-hidden
            className="h-8 w-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 32"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity="0.28"
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
              strokeWidth="1.5"
            />
          </svg>
        ) : null}
      </Card.Content>
    </Card>
  );
}
