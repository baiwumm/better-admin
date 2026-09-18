import type { StatsNoticeItem } from "@/lib/api-types";

import { Avatar, Card, Typography } from "@heroui/react";
import { Megaphone } from "lucide-react";

import { useTranslation } from "@/i18n";
import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { formatDateTime } from "@/lib/format-date";

/**
 * 最新公告卡（plan §4.2 副图 2）：已发布公告标题 + 发布人 + 发布时间
 * （服务端仅返回标题/时间/发布人显示名，不含正文与范围等敏感信息；
 * 每条两行布局与最近动态 5 条高度基本一致）。
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
              className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-default"
            >
              <Megaphone
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0"
                style={{ color: "var(--muted)" }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {item.title}
                </p>
                <div className="flex items-center gap-1.5">
                  {/* key 随头像变化重建子树，规避 Radix Avatar 图片状态残留（同 UserInfo 口径） */}
                  <Avatar
                    key={item.publisherAvatar ?? "fallback"}
                    className="size-4 shrink-0"
                    color="accent"
                    variant="soft"
                  >
                    {item.publisherAvatar ? (
                      <Avatar.Image
                        alt={item.publisherName ?? ""}
                        src={item.publisherAvatar}
                      />
                    ) : null}
                    <Avatar.Fallback>
                      {(item.publisherName ?? "?").slice(0, 1)}
                    </Avatar.Fallback>
                  </Avatar>
                  <Typography color="muted" type="body-sm">
                    {t("features.dashboard.notices.publisher")}
                    {item.publisherName ??
                      t("features.dashboard.notices.unknownPublisher")}
                  </Typography>
                </div>
              </div>
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
