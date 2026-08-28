import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import type { IconName } from "lucide-react/dynamic";
import type { PermissionItem } from "@/lib/api-types";

import { Chip, Typography } from "@heroui/react";
import { getCoreRowModel, useLegacyTable } from "@tanstack/react-table/legacy";
import { DynamicIcon } from "lucide-react/dynamic";
import { useMemo } from "react";

import { DataTable } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header/page-header";
import { useTranslation } from "@/i18n";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * 权限管理页（只读展示）。
 *
 * 数据来源：GET /api/permissions 由后端唯一下发权限点定义（value/label/bits/icon），
 * 前端不硬编码位掩码；本页仅展示，不提供任何 CRUD 操作。
 */

type PermissionRow = PermissionItem & { order: number };

function PermissionsTable({
  isLoading,
  items,
}: {
  isLoading: boolean;
  items: PermissionRow[];
}) {
  const { t } = useTranslation();

  const columns = useMemo<LegacyColumnDef<PermissionRow>[]>(
    () => [
      {
        id: "icon",
        enableSorting: false,
        header: t("features.permissions.column.icon"),
        cell: ({ row }) =>
          row.original.icon ? (
            <DynamicIcon
              aria-hidden
              className="size-4 text-muted"
              name={row.original.icon as IconName}
              size={16}
            />
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        id: "label",
        enableSorting: false,
        header: t("features.permissions.column.name"),
        cell: ({ row }) => (
          <Typography className="font-medium" type="body-sm">
            {row.original.label}
          </Typography>
        ),
      },
      {
        id: "value",
        enableSorting: false,
        header: t("features.permissions.column.value"),
        cell: ({ row }) => (
          <Chip size="sm" variant="secondary">
            {row.original.value}
          </Chip>
        ),
      },
      {
        id: "bits",
        enableSorting: false,
        header: t("features.permissions.column.bits"),
        cell: ({ row }) => (
          <Typography color="muted" type="body-sm">
            {row.original.bits}
          </Typography>
        ),
      },
    ],
    [t],
  );

  const table = useLegacyTable({
    columns,
    data: items,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      aria-label={t("menu.pageTitle.permissions")}
      className="w-full"
      contentClassName="min-w-[560px]"
      isLoading={isLoading}
      table={table}
    />
  );
}

export function PermissionsPage() {
  const { data, isLoading } = usePermissions();

  // 按位掩码值升序展示（SEARCH=1 → SETTINGS_UPDATE=128），排序不进入表格交互
  const items = useMemo<PermissionRow[]>(
    () =>
      (data ?? [])
        .map((item, index) => ({ ...item, order: index }))
        .sort((a, b) => a.bits - b.bits || a.order - b.order),
    [data],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8">
      <PageHeader
        descriptionKey="features.permissions.description"
        titleKey="menu.pageTitle.permissions"
      />
      <PermissionsTable isLoading={isLoading} items={items} />
    </div>
  );
}
