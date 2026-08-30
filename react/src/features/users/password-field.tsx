import {
  Button,
  Description,
  FieldError,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useTranslation } from "@/i18n";

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** 错误态文案（zodResolver 校验消息），无错误时不渲染 */
  error?: string;
  /** 无错误时的辅助说明 */
  description?: string;
  autoComplete?: string;
}

/**
 * 表单内密码输入框（可见性切换）：与共享 PasswordInput 的差异在于
 * 支持 Label / FieldError / Description 完整字段结构，供 react-hook-form
 * 的 Controller 在新建/编辑与重置密码弹窗中做内联校验展示。
 */
export function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  description,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      className="flex flex-col gap-1"
      isInvalid={Boolean(error)}
      value={value}
      onBlur={onBlur}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <InputGroup variant="secondary">
        <InputGroup.Input
          autoComplete={autoComplete}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
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
      {error ? <FieldError>{error}</FieldError> : null}
      {!error && description ? <Description>{description}</Description> : null}
    </TextField>
  );
}
