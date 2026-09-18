import type { StatsSeriesPoint } from "@/lib/api-types";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTranslation } from "@/i18n";

/**
 * 登录趋势主图表（plan §4.1 视觉语言 2）：Recharts AreaChart，
 * 主色垂直渐变面积 + monotone 平滑曲线 + 弱网格 + 毛玻璃 Tooltip。
 *
 * 以默认导出经 React.lazy 分包加载（recharts 不进首屏 chunk）。
 */

interface LoginTrendChartProps {
  series: StatsSeriesPoint[];
}

/** 毛玻璃 Tooltip 内容（div 承载样式，recharts 只负责定位） */
function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  const { t } = useTranslation();

  if (!active || !payload?.length) return null;

  return (
    <div className="dashboard-chart-tooltip">
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p
        className="text-sm font-semibold tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        {t("features.dashboard.chart.logins")}：{payload[0]?.value}
      </p>
    </div>
  );
}

export default function LoginTrendChart({ series }: LoginTrendChartProps) {
  return (
    <div className="dashboard-trend-glow h-64 w-full rounded-xl">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={series}
          margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="login-trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
              <stop
                offset="100%"
                stopColor="var(--accent)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={24}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: "var(--border)" }}
          />
          <Area
            isAnimationActive
            animationDuration={600}
            dataKey="count"
            fill="url(#login-trend-fill)"
            stroke="var(--accent)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
