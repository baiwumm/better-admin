import type { ReactNode } from "react";

import { ListBox, Select } from "@heroui/react";

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
 * 有值时 trigger 内渲染 Select.ClearButton，清空即 onChange(null)。
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
      onClear={() => onChange(null)}
    >
      <Select.Trigger>
        <Select.Value />
        {/* Select.ClearButton 渲染为 span（trigger 是 button，不可嵌套 button）：
            有值时显示、无值自动隐藏；内置阻断 trigger press 链防止误开下拉，
            并使 trigger 支持 Backspace/Delete 键盘清空，两条路径均触发 onClear */}
        <Select.ClearButton />
        <Select.Indicator />
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
