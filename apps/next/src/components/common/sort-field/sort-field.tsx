"use client";

import type { FC } from "react";

import { Label, NumberField } from "@heroui/react";
import { z } from "zod";
import { useId } from "react";

import { useTranslation } from "@/i18n";

/** 排序字段通用校验规则（各表单 schema 引用，规则单点维护） */
export const sortFieldSchema = z.number().int().min(0).max(999);

export interface SortFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * 表单「排序」字段（Label + 步进数字输入）：角色 / 字典项 / 菜单等表单
 * 共用的展示组合组件，规则为 0-999 整数（zod 侧配套 sortFieldSchema）。
 *
 * @example
 * <SortField
 *   value={watch("sort")}
 *   onChange={(value) => setValue("sort", value, { shouldValidate: true })}
 * />
 */
export const SortField: FC<SortFieldProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
}) => {
  const { t } = useTranslation();
  // Label 与真实输入框显式关联（点击标签可聚焦；aria-label 保留兜底可及名）
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={inputId}>{t("common.column.sort")}</Label>
      <NumberField
        aria-label={t("common.column.sort")}
        maxValue={max}
        minValue={min}
        value={value}
        variant="secondary"
        onChange={(next) => onChange(Number.isFinite(next) ? next : 0)}
      >
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="w-32" id={inputId} />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
    </div>
  );
};
