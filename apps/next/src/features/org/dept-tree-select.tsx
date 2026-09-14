"use client";

import type { DeptTreeNode } from "@/lib/api-types";

import {
  Avatar,
  ListBox,
  Select,
  Label,
  FieldError,
  Spinner,
} from "@heroui/react";
import { useMemo } from "react";

import { useTranslation } from "@/i18n";

/**
 * 组织树下拉选择器（前缀符号表达树形层级；HeroUI 无 Tree 组件）。
 *
 * 组织表单（父级）与用户表单（所属组织）共用：
 * - 选项 = 全量组织树平铺，全角空格逐级缩进、非顶级以「└ 」标记层级，
 *   有编码的组织以「名称(编码)」展示（对齐 Nuxt 端组织下拉），
 *   有负责人时名称前展示小尺寸头像（无图回退负责人首字）；
 *   value 为组织 id，"" 表示未选择
 *   （「顶级组织」或「无组织」的语义由调用方的占位文案/提示表达）；
 * - selfId 传入时禁选自身及其全部后代（组织父级防环）；
 * - 停用组织一律禁选（停用后不可关联新数据）。
 */

/** 下拉项负责人头像（有负责人才生成；alt 为 fallback 首字来源） */
interface DeptOptionAvatar {
  src?: string;
  alt: string;
}

interface DeptOption {
  id: string;
  label: string;
  avatar: DeptOptionAvatar | null;
  disabled: boolean;
}

function buildOptions(
  tree: DeptTreeNode[],
  selfId: string | null,
): DeptOption[] {
  const options: DeptOption[] = [];

  const walk = (nodes: DeptTreeNode[], level: number, underSelf: boolean) => {
    for (const node of nodes) {
      const isSelf = node.id === selfId;
      const disabled = node.status !== "enabled" || underSelf || isSelf;
      const prefix = "　".repeat(level) + (level > 0 ? "└ " : "");
      const label = node.code ? `${node.name}(${node.code})` : node.name;
      const avatar: DeptOptionAvatar | null = node.leaderName
        ? { src: node.leaderAvatar ?? undefined, alt: node.leaderName }
        : null;

      options.push({ id: node.id, label: prefix + label, avatar, disabled });
      walk(node.children, level + 1, underSelf || isSelf);
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
  /** 选项加载中：Indicator 渲染为 Spinner（其余状态回落默认下拉箭头） */
  isLoading?: boolean;
  ariaLabel: string;
  className?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  showLabel?: boolean;
}

export function DeptTreeSelect({
  value,
  onChange,
  tree,
  selfId = null,
  isLoading = false,
  ariaLabel,
  className,
  isDisabled = false,
  isInvalid = false,
  showLabel = false,
}: DeptTreeSelectProps) {
  const { t } = useTranslation();
  const options = useMemo(() => buildOptions(tree, selfId), [tree, selfId]);

  return (
    <Select
      isRequired
      aria-label={ariaLabel}
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      placeholder={t("features.org.deptTreeSelect.placeholder")}
      value={value || null}
      variant="secondary"
      onChange={(key) => onChange(key === null ? "" : String(key))}
    >
      {showLabel && <Label>{t("features.posts.form.dept")}</Label>}
      <Select.Trigger>
        <Select.Value />
        {/* 加载中 Indicator 渲染为 Spinner；其余状态回落默认下拉箭头 */}
        {isLoading ? (
          <Select.Indicator>
            <Spinner size="sm" />
          </Select.Indicator>
        ) : (
          <Select.Indicator />
        )}
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
              <span className="flex min-w-0 items-center gap-1.5">
                {option.avatar ? (
                  <Avatar
                    aria-hidden
                    className="size-5 shrink-0"
                    color="accent"
                    variant="soft"
                  >
                    {option.avatar.src ? (
                      <Avatar.Image
                        alt={option.avatar.alt}
                        loading="lazy"
                        src={option.avatar.src}
                      />
                    ) : null}
                    <Avatar.Fallback className="text-[10px]">
                      {option.avatar.alt.slice(0, 1)}
                    </Avatar.Fallback>
                  </Avatar>
                ) : null}
                <span className="block truncate">{option.label}</span>
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {isInvalid && (
        <FieldError>{t("features.posts.form.deptRequired")}</FieldError>
      )}
    </Select>
  );
}
