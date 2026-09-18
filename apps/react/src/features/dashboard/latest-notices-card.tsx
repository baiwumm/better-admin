import type { StatsNoticeItem } from "@/lib/api-types";

import { Card } from "@heroui/react";
import { Megaphone } from "lucide-react";

import { useTranslation } from "@/i18n";
import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { formatDateTime } from "@/lib/format-date";

/**
 * 最新公告卡（plan §4.2 副图 2）：已发布公告标题 + 发布时间
 * （服务端仅返回标题与时间，不含正文与范围等敏感信息）。
 */

interface LatestNoticesCardProps {
  items: StatsNoticeItem[];
}

export function LatestNoticesCard({ items }: LatestNoticesCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title className="flex items-center gap-2 text-base">
          <Megaphone
            aria-hidden
            className="size-4"
            style={{ color: "var(--accent)" }}
          />
          {t("features.dashboard.notices.title")}
        </Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1">
        {items.length === 0 ? (
          <EmptyContent title={t("features.dashboard.notices.empty")} />
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-default"
            >
              <Megaphone
                aria-hidden
                className="size-3.5 shrink-0"
                style={{ color: "var(--muted)" }}
              />
              <p
                className="min-w-0 flex-1 truncate text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {item.title}
              </p>
              <time
                className="shrink-0 text-xs tabular-nums"
                dateTime={item.publishTime}
                style={{ color: "var(--muted)" }}
              >
                {formatDateTime(item.publishTime, i18n.language)}
              </time>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}
