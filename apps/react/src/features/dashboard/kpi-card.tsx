import type { ReactNode } from "react";

import { Card } from "@heroui/react";
import NumberFlow from "@number-flow/react";

/**
 * KPI 统计卡（HeroUI Pro 风格扁平版）：标题 + 大号数字（NumberFlow 滚动，
 * tabular-nums）+ 右上角状态 badge，单行紧凑布局。
 * 视觉全部复用项目级 Design Tokens（badge 用语义色浅底）。
 */

export type KpiBadgeTone = "up" | "down" | "accent" | "neutral";

interface KpiCardProps {
  label: string;
  value: number;
  /** 右上角状态 badge（环比 / 今日增量等；缺省不展示） */
  badge?: ReactNode;
  /** badge 色调（up=涨 / down=跌 / accent=主色浅底 / neutral=中性） */
  badgeTone?: KpiBadgeTone;
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

export function KpiCard({
  label,
  value,
  badge,
  badgeTone = "neutral",
}: KpiCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <Card.Content className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {label}
          </p>
          {badge ? (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
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
      </Card.Content>
    </Card>
  );
}
