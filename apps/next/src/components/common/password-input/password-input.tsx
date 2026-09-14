"use client";

import type { ComponentProps } from "react";

import { Button, InputGroup, Label, TextField } from "@heroui/react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useTranslation } from "@/i18n";

type InputProps = ComponentProps<typeof InputGroup.Input>;

export interface PasswordInputProps extends InputProps {
  label?: string;
}

/**
 * 密码输入框（可见性切换）：兼容 react-hook-form 的 register 展开用法。
 *
 * @example <PasswordInput label={...} {...register("password")} />
 */
export function PasswordInput({ label, ...inputProps }: PasswordInputProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      aria-label={
        label ?? inputProps["aria-label"] ?? t("common.password.input")
      }
      className="w-full"
    >
      {label && <Label>{label}</Label>}
      <InputGroup variant="secondary">
        <InputGroup.Input
          type={isVisible ? "text" : "password"}
          {...inputProps}
        />
        <InputGroup.Suffix className="pe-0">
          <Button
            isIconOnly
            aria-label={
              isVisible ? t("common.password.hide") : t("common.password.show")
            }
            size="sm"
            variant="ghost"
            onPress={() => setIsVisible((prev) => !prev)}
          >
            {isVisible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}
