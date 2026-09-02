"use client";

import type { DeptTreeNode } from "@/lib/api-types";

import { ListBox, Select } from "@heroui/react";
import { useMemo } from "react";

import { useTranslation } from "@/i18n";

/**
 * 组织树下拉选择器（平铺缩进表达树形层级；HeroUI 无 Tree 组件）。
 *
 * 组织表单（父级）与用户表单（所属组织）共用：
 * - 选项 = 全量组织树平铺，逐级缩进；value 为组织 id，"" 表示未选择
 *   （「顶级组织」或「无组织」的语义由调用方的占位文案/提示表达）；
 * - selfId 传入时禁选自身及其全部后代（组织父级防环）；
 * - 停用组织一律禁选（停用后不可关联新数据）。
 */

interface DeptOption {
  id: string;
  label: string;
  depth: number;
  disabled: boolean;
}

function buildOptions(
  tree: DeptTreeNode[],
  selfId: string | null,
): DeptOption[] {
  const options: DeptOption[] = [];

  const walk = (nodes: DeptTreeNode[], depth: number, underSelf: boolean) => {
    for (const node of nodes) {
      const isSelf = node.id === selfId;
      const disabled = node.status !== "enabled" || underSelf || isSelf;

      options.push({ id: node.id, label: node.name, depth, disabled });
      walk(node.children, depth + 1, underSelf || isSelf);
    }
  };

  walk(tree, 0, false);

  return options;
}

export interface DeptTreeSelectProps {
  /** 当前选中组织 id（"" = 未选择） */
  value: string;
  onChange: (key: string) => void;
  /** 全量组织树（/org/depts/tree） */
  tree: DeptTreeNode[];
  /** 禁选自身及后代（组织表单编辑防环场景）；缺省不禁 */
  selfId?: string | null;
  ariaLabel: string;
  className?: string;
  isDisabled?: boolean;
}

export function DeptTreeSelect({
  value,
  onChange,
  tree,
  selfId = null,
  ariaLabel,
  className,
  isDisabled = false,
}: DeptTreeSelectProps) {
  const { t } = useTranslation();
  const options = useMemo(() => buildOptions(tree, selfId), [tree, selfId]);

  return (
    <Select
      aria-label={ariaLabel}
      className={className}
      isDisabled={isDisabled}
      placeholder={t("features.org.deptTreeSelect.placeholder")}
      value={value || null}
      variant="secondary"
      onChange={(key) => onChange(key === null ? "" : String(key))}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={ariaLabel}>
          {options.map((option) => (
            <ListBox.Item
              key={option.id}
              id={option.id}
              isDisabled={option.disabled}
              textValue={option.label}
            >
              <span
                className="block truncate"
                style={{ paddingInlineStart: option.depth * 16 }}
              >
                {option.label}
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
