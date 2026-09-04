import type { ReactNode } from "react";
import type { Log } from "@/lib/api-types";

import { Button, Chip, Drawer, Typography } from "@heroui/react";
import { ScrollText } from "lucide-react";

import { logOperator } from "./log-api";
import { logTypeColor } from "./log-type";

import { UserInfo } from "@/components/common/user-info/user-info";
import { useTranslation } from "@/i18n";
import { formatDateTime } from "@/lib/format-date";

export interface LogDetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** 详情目标日志（列表行数据与详情接口同构，直接复用免二次请求） */
  log: Log | null;
  /** 类型显示名（由页面按字典解析后传入） */
  typeLabel: string;
}

/** 详情字段行：标签在上、内容在下（长内容如 UA / JSON 需要整行宽度） */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Typography color="muted" type="body-xs">
        {label}
      </Typography>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * 日志详情抽屉：展示单条日志完整字段。
 * 数据直接来自列表行（列表/详情同构），无独立加载态。
 */
export function LogDetailDrawer({
  isOpen,
  onOpenChange,
  log,
  typeLabel,
}: LogDetailDrawerProps) {
  const { t, i18n } = useTranslation();

  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content placement="right">
        <Drawer.Dialog className="w-104 max-w-[85vw]">
          <Drawer.CloseTrigger />
          {log && (
            <>
              <Drawer.Header>
                <Drawer.Heading className="flex items-center gap-2">
                  <ScrollText className="size-5 text-muted" />
                  {t("features.logs.detail.title")}
                </Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>
                <div className="flex flex-col gap-4">
                  <DetailRow label={t("features.logs.column.type")}>
                    <Chip
                      color={logTypeColor(log.type)}
                      size="sm"
                      variant="soft"
                    >
                      {typeLabel}
                    </Chip>
                  </DetailRow>
                  <DetailRow label={t("features.logs.column.operator")}>
                    <UserInfo user={logOperator(log)} />
                  </DetailRow>
                  <DetailRow label={t("features.logs.column.action")}>
                    <Typography className="break-all" type="body-sm">
                      {log.action}
                    </Typography>
                  </DetailRow>
                  <DetailRow label={t("features.logs.column.ip")}>
                    <Typography color="muted" type="body-sm">
                      {log.ip ?? "—"}
                    </Typography>
                  </DetailRow>
                  <DetailRow label={t("features.logs.detail.userAgent")}>
                    <Typography
                      className="break-all"
                      color="muted"
                      type="body-xs"
                    >
                      {log.userAgent ?? "—"}
                    </Typography>
                  </DetailRow>
                  <DetailRow label={t("common.column.createdAt")}>
                    <Typography type="body-sm">
                      {formatDateTime(log.createdAt, i18n.language)}
                    </Typography>
                  </DetailRow>
                  <DetailRow label={t("features.logs.detail.extra")}>
                    {log.detail == null ? (
                      <Typography color="muted" type="body-sm">
                        —
                      </Typography>
                    ) : (
                      <pre className="overflow-x-auto rounded-md bg-default p-3 text-xs leading-relaxed">
                        {JSON.stringify(log.detail, null, 2)}
                      </pre>
                    )}
                  </DetailRow>
                </div>
              </Drawer.Body>
              <Drawer.Footer>
                <Button fullWidth slot="close">
                  {t("common.close")}
                </Button>
              </Drawer.Footer>
            </>
          )}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
