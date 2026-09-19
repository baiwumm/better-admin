import type { StatsLogItem } from "@/lib/api-types";
import type { ReactNode } from "react";

import { Avatar, Card, Typography } from "@heroui/react";
import { Activity } from "lucide-react";

import { useTranslation } from "@/i18n";
import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { formatRelativeTime } from "@/lib/format-date";

/**
 * 最近动态卡（HeroUI Pro 风格）：用户首字头像 + 操作人 + 动作人话文案 +
 * 相对时间。数据为 type=operation 日志（服务端已剔除敏感字段；接口不返回
 * 头像，以姓名首字 Avatar fallback 呈现，风格与 HeroUI Pro 示例一致）。
 */

interface RecentActivityCardProps {
  items: StatsLogItem[];
  /** 卡头右侧出口（由页面按菜单可见性判定后传入；缺省不渲染） */
  action?: ReactNode;
}

/**
 * action → i18n 键映射（人话文案）。覆盖内置操作与登录/登出动作；
 * 未收录的 action 回退显示原始值（等宽小字，保证不丢信息）。
 */
const ACTION_I18N: Record<string, string> = {
  "user.create": "features.dashboard.action.userCreate",
  "user.update": "features.dashboard.action.userUpdate",
  "user.delete": "features.dashboard.action.userDelete",
  "role.create": "features.dashboard.action.roleCreate",
  "role.update": "features.dashboard.action.roleUpdate",
  "menu.update": "features.dashboard.action.menuUpdate",
  "dept.create": "features.dashboard.action.deptCreate",
  "dept.update": "features.dashboard.action.deptUpdate",
  "dept.sort": "features.dashboard.action.deptSort",
  "post.create": "features.dashboard.action.postCreate",
  "post.update": "features.dashboard.action.postUpdate",
  "notice.create": "features.dashboard.action.noticeCreate",
  "notice.update": "features.dashboard.action.noticeUpdate",
  "notice.withdraw": "features.dashboard.action.noticeWithdraw",
  "notice.remind": "features.dashboard.action.noticeRemind",
  "log.delete": "features.dashboard.action.logDelete",
  "login.success": "features.dashboard.action.loginSuccess",
  "login.success.demo": "features.dashboard.action.loginDemo",
  logout: "features.dashboard.action.logout",
};

export function RecentActivityCard({ items, action }: RecentActivityCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <Card className="dashboard-card h-full">
      <Card.Header className="flex-row items-center justify-between gap-2">
        <Card.Title className="flex items-center gap-2 text-base">
          <Activity
            aria-hidden
            className="size-4"
            style={{ color: "var(--accent)" }}
          />
          {t("features.dashboard.activity.title")}
        </Card.Title>
        {action}
      </Card.Header>
      <Card.Content className="flex flex-col gap-1">
        {items.length === 0 ? (
          <EmptyContent title={t("features.dashboard.activity.empty")} />
        ) : (
          items.map((item) => {
            const name =
              item.displayName ??
              item.username ??
              t("features.dashboard.activity.system");
            const actionKey = ACTION_I18N[item.action];

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-default"
              >
                {/* key 随 avatar 变化重建子树：Radix Avatar 图片加载状态卸载后不重置
                    （同 UserInfo 组件口径），避免头像加载失败后 Fallback 不回显 */}
                <Avatar
                  key={item.avatar ?? "fallback"}
                  className="shrink-0"
                  color="accent"
                  size="sm"
                  variant="soft"
                >
                  {item.avatar ? (
                    <Avatar.Image alt={name} src={item.avatar} />
                  ) : null}
                  <Avatar.Fallback>{name.slice(0, 1)}</Avatar.Fallback>
                </Avatar>
                <Typography className="min-w-0 flex-1 truncate" type="body-sm">
                  <span
                    className="font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {name}
                  </span>
                  {actionKey ? (
                    <span className="ml-1.5" style={{ color: "var(--muted)" }}>
                      {t(actionKey)}
                    </span>
                  ) : (
                    <span
                      className="ml-1.5 font-mono text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {item.action}
                    </span>
                  )}
                </Typography>
                <time
                  className="shrink-0 text-xs tabular-nums"
                  dateTime={item.createdAt}
                  style={{ color: "var(--muted)" }}
                >
                  {formatRelativeTime(item.createdAt, i18n.language)}
                </time>
              </div>
            );
          })
        )}
      </Card.Content>
    </Card>
  );
}
