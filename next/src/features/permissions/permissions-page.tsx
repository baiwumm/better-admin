"use client";

import type { TFunction } from "i18next";
import type { IconName } from "lucide-react/dynamic";
import type { PermissionItem } from "@/lib/api-types";

import { Typography } from "@heroui/react";
import { useTable } from "@tanstack/react-table";
import { DynamicIcon } from "lucide-react/dynamic";
import { useMemo, useState } from "react";
import { SearchField } from "@heroui/react";

import { DataTable } from "@/components/common/data-table";
import {
  DataTableSearchReset,
  DataTableToolbar,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import {
  appTableFeatures,
  type AppColumnDef,
} from "@/components/common/data-table/table-types";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 权限管理页（只读展示）。
 *
 * 数据来源：GET /api/permissions 由后端唯一下发权限点定义（value/label/bits/icon），
 * 前端不硬编码位掩码；本页仅展示，不提供任何 CRUD 操作。
 * 权限名称由前端按 value 做 i18nKey 映射（后端 label 仅有中文），
 * 显示格式「名称(权限点)」，如「搜索(SEARCH)」。
 * 数据量小（个位数权限点），全量展示、前端过滤，不接服务端分页。
 */

type PermissionRow = PermissionItem & { order: number };

/** 权限点显示名（不含括号部分）：i18n 映射优先，缺失回退后端 label */
function getPermissionBaseName(item: PermissionItem, t: TFunction) {
  const key = `features.permissions.items.${item.value}`;
  const translated = t(key);

  return translated === key ? item.label : translated;
}

export function PermissionsPage() {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id);
  const { data, isLoading } = usePermissions();
  // 搜索采用提交式语义：输入框输入 → 「搜索」按钮 / Enter 应用，「重置」清空
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const applySearch = () => setSearch(searchInput.trim());

  const resetSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  // 按位掩码值升序展示（SEARCH=1 → GRANT=256），排序不进入表格交互
  const items = useMemo<PermissionRow[]>(
    () =>
      (data ?? [])
        .map((item, index) => ({ ...item, order: index }))
        .sort((a, b) => a.bits - b.bits || a.order - b.order),
    [data],
  );

  // 前端过滤：匹配显示名（i18n 映射后）、权限点 value、后端原始 label
  const filtered = useMemo<PermissionRow[]>(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return items;

    return items.filter((item) =>
      [getPermissionBaseName(item, t), item.value, item.label].some((text) =>
        text.toLowerCase().includes(normalized),
      ),
    );
  }, [items, search, t]);

  const columns = useMemo<AppColumnDef<PermissionRow>[]>(
    () => [
      {
        id: "label",
        enableSorting: false,
        header: t("features.permissions.column.name"),
        cell: ({ row }) => {
          const item = row.original;

          return (
            <Typography className="font-medium" type="body-sm">
              {getPermissionBaseName(item, t)}
              <span className="ms-1 text-muted">({item.value})</span>
            </Typography>
          );
        },
      },
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

  const table = useTable({
    columns,
    data: filtered,
    features: appTableFeatures,
    // 全量展示：关闭自动分页切片（本页不渲染分页条）
    manualPagination: true,
  });

  return (
    <div className="flex w-full flex-col pb-8">
      <DataTableToolbar
        columnSettingKey={
          userId ? buildColumnSettingKey(userId, "/permissions") : undefined
        }
        table={table}
      >
        <SearchField
          aria-label={t("common.datatable.searchLabel")}
          className="w-64"
          value={searchInput}
          variant="secondary"
          onChange={setSearchInput}
          onSubmit={applySearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder={t("features.permissions.searchPlaceholder")}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {/* 纯本地过滤：无请求态，搜索/重置恒可点 */}
        <DataTableSearchReset
          canReset
          searchDirty
          onReset={resetSearch}
          onSearch={applySearch}
        />
      </DataTableToolbar>
      <DataTable
        aria-label={t("menu.pageTitle.permissions")}
        className="w-full"
        contentClassName="min-w-[560px]"
        isLoading={isLoading}
        table={table}
      />
    </div>
  );
}
