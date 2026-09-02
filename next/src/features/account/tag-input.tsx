"use client";

import { Button, Chip, InputGroup, Label, TextField } from "@heroui/react";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { useTranslation } from "@/i18n";

/**
 * 个人标签输入（我的账户基本信息卡）：输入框回车或点添加按钮提交一个标签，
 * Chip 展示可删除。约束与后端规约一致：最多 10 个、单项 trim 后 1-20 字符、
 * 重复标签忽略；超限在输入框下方给出内联错误提示。
 *
 * HeroUI 无 TagInput 组件，此为遵循现有 Design Tokens 的项目级自定义组件
 * （§7.2 组件选择规则第 3/4 条）。
 */

export const TAG_MAX_COUNT = 10;
export const TAG_MAX_LENGTH = 20;

export interface TagInputProps {
  /** 标签列表（受控，全量数组） */
  value: string[];
  onChange: (tags: string[]) => void;
  /** 字段标签文案 */
  label: string;
  placeholder?: string;
  isDisabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  label,
  placeholder,
  isDisabled,
}: TagInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** 提交草稿：校验 → 去重 → 追加；非法时给出内联提示 */
  const commitDraft = () => {
    const tag = draft.trim();

    if (!tag) return;
    if (tag.length > TAG_MAX_LENGTH) {
      setError(t("features.account.tags.tooLong", { max: TAG_MAX_LENGTH }));

      return;
    }
    if (value.includes(tag)) {
      setError(t("features.account.tags.duplicated"));

      return;
    }
    if (value.length >= TAG_MAX_COUNT) {
      setError(t("features.account.tags.tooMany", { max: TAG_MAX_COUNT }));

      return;
    }
    onChange([...value, tag]);
    setDraft("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <TextField
        className="flex flex-col gap-1"
        isDisabled={isDisabled}
        value={draft}
        onChange={(next) => {
          setDraft(next);
          setError(null);
        }}
      >
        <Label>{label}</Label>
        <InputGroup variant="secondary">
          <InputGroup.Input
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // 阻止表单默认提交（回车仅用于确认标签）
                event.preventDefault();
                commitDraft();
              } else if (
                event.key === "Backspace" &&
                draft === "" &&
                value.length > 0
              ) {
                onChange(value.slice(0, -1));
              }
            }}
          />
          <InputGroup.Suffix className="pe-0">
            <Button
              isIconOnly
              aria-label={t("features.account.tags.add")}
              isDisabled={isDisabled}
              size="sm"
              variant="ghost"
              onPress={commitDraft}
            >
              <Plus className="size-4" />
            </Button>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {!error && value.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {value.map((tag) => (
            <Chip key={tag} size="sm" variant="soft">
              {tag}
              <Button
                aria-label={t("features.account.tags.remove", { tag })}
                className="ms-0.5 size-4 min-w-0 rounded-full p-0"
                isDisabled={isDisabled}
                size="sm"
                variant="ghost"
                onPress={() => onChange(value.filter((item) => item !== tag))}
              >
                <X className="size-3" />
              </Button>
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
