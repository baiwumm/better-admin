import type { StatsLogItem } from "@/lib/api-types";

import { Card } from "@heroui/react";
import { Activity } from "lucide-react";

import { useTranslation } from "@/i18n";
import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { formatRelativeTime } from "@/lib/format-date";

/**
 * 最近动态卡（plan §4.2 动态流）：操作日志流（图标 + 操作人 + 动作 + 相对时间），
 * 数据为 type=operation 日志（服务端已剔除敏感字段）。
 */

interface RecentActivityCardProps {
  items: StatsLogItem[];
}

export function RecentActivityCard({ items }: RecentActivityCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title className="flex items-center gap-2 text-base">
          <Activity
            aria-hidden
            className="size-4"
            style={{ color: "var(--accent)" }}
          />
          {t("features.dashboard.activity.title")}
        </Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1">
        {items.length === 0 ? (
          <EmptyContent title={t("features.dashboard.activity.empty")} />
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-default"
            >
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    "color-mix(in oklch, var(--accent) 10%, transparent)",
                }}
              >
                <Activity
                  aria-hidden
                  className="size-3.5"
                  style={{ color: "var(--accent)" }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {item.displayName ??
                    item.username ??
                    t("features.dashboard.activity.system")}
                  <span className="mx-1.5" style={{ color: "var(--muted)" }}>
                    ·
                  </span>
                  <span className="font-mono text-xs">{item.action}</span>
                </p>
              </div>
              <time
                className="shrink-0 text-xs tabular-nums"
                dateTime={item.createdAt}
                style={{ color: "var(--muted)" }}
              >
                {formatRelativeTime(item.createdAt, i18n.language)}
              </time>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}
