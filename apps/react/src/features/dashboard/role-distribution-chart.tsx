import type { StatsRoleSlice } from "@/lib/api-types";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useTranslation } from "@/i18n";

/**
 * 角色占比环形图（plan §4.2 副图 1）：Recharts donut + 同色系透明度阶梯图例
 * （主色明度阶梯派生，不新增色值，四端以同一 opacity 标度对齐）。
 *
 * 以默认导出经 React.lazy 分包加载。
 */

interface RoleDistributionChartProps {
  slices: StatsRoleSlice[];
}

/** 主色透明度阶梯（克制式同色系，plan §4.1 硬性约束：不新增色值） */
const SLICE_OPACITIES = [1, 0.78, 0.58, 0.42, 0.28, 0.16, 0.08];

/** 毛玻璃 Tooltip 内容 */
function RoleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
}) {
  const { t } = useTranslation();

  if (!active || !payload?.length) return null;

  return (
    <div className="dashboard-chart-tooltip">
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {payload[0]?.name}
      </p>
      <p
        className="text-sm font-semibold tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        {t("features.dashboard.chart.members")}：{payload[0]?.value}
      </p>
    </div>
  );
}

export default function RoleDistributionChart({
  slices,
}: RoleDistributionChartProps) {
  const data = slices.map((s, i) => ({
    ...s,
    fill: `color-mix(in oklch, var(--accent) ${Math.round(SLICE_OPACITIES[i % SLICE_OPACITIES.length] * 100)}%, transparent)`,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-40 w-full flex-1">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Tooltip content={<RoleTooltip />} />
            <Pie
              data={data}
              dataKey="count"
              innerRadius="62%"
              nameKey="roleName"
              outerRadius="92%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.roleCode} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5">
        {data.map((entry) => (
          <li key={entry.roleCode} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: entry.fill }}
            />
            <span className="truncate" style={{ color: "var(--foreground)" }}>
              {entry.roleName}
            </span>
            <span
              className="ml-auto shrink-0 text-xs tabular-nums"
              style={{ color: "var(--muted)" }}
            >
              {entry.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
