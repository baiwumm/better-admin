import type { AccountProfile } from "@/lib/api-types";
import type { ReactNode } from "react";

import { Card, Chip, Description, Typography } from "@heroui/react";

import { useTranslation } from "@/i18n";
import { formatDateTime } from "@/lib/format-date";

export interface AccountInfoCardProps {
  profile: AccountProfile;
}

/** 只读账号信息卡：角色 / 状态 / 注册时间 / 最近登录 */
export function AccountInfoCard({ profile }: AccountInfoCardProps) {
  const { t, i18n } = useTranslation();

  const infoRows: { label: string; value: ReactNode }[] = [
    {
      label: t("features.account.info.roles"),
      value:
        profile.roles.length > 0 ? (
          <span className="flex flex-wrap items-center gap-1">
            {profile.roles.map((role) => (
              <Chip key={role.id} size="sm">
                {role.name}
              </Chip>
            ))}
          </span>
        ) : (
          <Typography color="muted" type="body-sm">
            {t("features.account.info.noRole")}
          </Typography>
        ),
    },
    {
      label: t("features.account.info.status"),
      value: (
        <Chip
          color={profile.status === "active" ? "success" : "danger"}
          size="sm"
          variant="soft"
        >
          {t(
            profile.status === "active"
              ? "features.account.info.statusActive"
              : "features.account.info.statusDisabled",
          )}
        </Chip>
      ),
    },
    {
      label: t("features.account.info.createdAt"),
      value: (
        <Description>
          {formatDateTime(profile.createdAt, i18n.language)}
        </Description>
      ),
    },
    {
      label: t("features.account.info.lastLoginAt"),
      value: (
        <Description>
          {profile.lastLoginAt
            ? formatDateTime(profile.lastLoginAt, i18n.language)
            : t("features.account.info.never")}
        </Description>
      ),
    },
  ];

  return (
    <Card>
      <Card.Header>
        <Card.Title className="font-bold">
          {t("features.account.info.title")}
        </Card.Title>
        <Card.Description className="text-xs">
          {t("features.account.info.description")}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {infoRows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <Typography color="muted" type="body-sm">
              {row.label}
            </Typography>
            {row.value}
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}
