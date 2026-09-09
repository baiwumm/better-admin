"use client";

import type { ReactNode } from "react";

import { ListBox, Select } from "@heroui/react";
import { X } from "lucide-react";

export interface DataTableFilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface DataTableFilterSelectProps {
  /** 当前值；null = 不筛选（展示 placeholder） */
  value: string | null;
  onChange: (value: string | null) => void;
  options: DataTableFilterOption[];
  /** 未选择时的字段名占位（如「岗位类别」「状态」） */
  placeholder: string;
  /** 无障碍标签 */
  "aria-label"?: string;
  className?: string;
}

/**
 * 通用单选筛选器（HeroUI Select）：用于状态、类型等单值筛选；
 * 选项可由 dict.store 驱动（字典数据），也可为静态枚举。
 * 不设「全部」选项：无值时展示 placeholder 字段名占位；
 * 有值时 trigger 内渲染清空图标，清空即 onChange(null)。
 */
export function DataTableFilterSelect({
  value,
  onChange,
  options,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: DataTableFilterSelectProps) {
  const handleChange = (key: string | number | null) => {
    if (key === null) {
      onChange(null);

      return;
    }
    onChange(String(key));
  };

  return (
    <Select
      aria-label={ariaLabel}
      className={className ?? "w-40"}
      placeholder={placeholder}
      value={value}
      variant="secondary"
      onChange={handleChange}
      onKeyDown={(e) => {
        // 键盘清空补偿：清空图标在 trigger 内不可聚焦（button 内禁嵌套
        // 可聚焦元素），Delete/Backspace 触发清空
        if ((e.key === "Delete" || e.key === "Backspace") && value !== null) {
          onChange(null);
        }
      }}
    >
      <Select.Trigger>
        <Select.Value />
        {/* 有选中值时 Indicator 渲染为内嵌清空图标：onPointerDown 阻断
            trigger 的 press 链防止误开下拉；无值传 undefined 回落默认
            下拉箭头 */}
        <Select.Indicator className="size-4">
          {value !== null ? (
            <X
              onClick={() => onChange(null)}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : undefined}
        </Select.Indicator>
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
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
