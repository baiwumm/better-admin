import type { ReactNode } from "react";

import { ListBox, Select } from "@heroui/react";

import { useTranslation } from "@/i18n";

/** 「全部」选项的内部值（提交给后端前由消费方转换为不传该参数） */
export const FILTER_ALL_VALUE = "__all__";

export interface DataTableFilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface DataTableFilterSelectProps {
  /** 当前值；null = 全部 */
  value: string | null;
  onChange: (value: string | null) => void;
  options: DataTableFilterOption[];
  /** 未选择时的展示文案（默认「全部」） */
  placeholder?: string;
  /** 无障碍标签（默认取 placeholder / 「全部」） */
  "aria-label"?: string;
  className?: string;
}

/**
 * 通用单选筛选器（HeroUI Select）：用于状态、类型等单值筛选；
 * 选项可由 dict.store 驱动（字典数据），也可为静态枚举。
 * 首项固定为「全部」（value=null），切换即触发 onChange。
 */
export function DataTableFilterSelect({
  value,
  onChange,
  options,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: DataTableFilterSelectProps) {
  const { t } = useTranslation();
  const allLabel = placeholder ?? t("common.datatable.filterAll");

  const handleChange = (key: string | number | null) => {
    if (key === null || key === FILTER_ALL_VALUE) {
      onChange(null);

      return;
    }
    onChange(String(key));
  };

  return (
    <Select
      aria-label={ariaLabel ?? allLabel}
      className={className ?? "w-40"}
      value={value ?? FILTER_ALL_VALUE}
      variant="secondary"
      onChange={handleChange}
    >
      <Select.Trigger>
        <Select.Value>{value ? undefined : allLabel}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={FILTER_ALL_VALUE} textValue={allLabel}>
            {allLabel}
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
            >
              {option.icon}
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
