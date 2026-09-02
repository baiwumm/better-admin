"use client";

import { cn } from "@heroui/react";
import { useMemo } from "react";

import { useTranslation } from "@/i18n";

/**
 * 密码强度指示（5 档）：5 段色条 + 档位文案。
 * 评分维度：长度（≥8 / ≥12）+ 字符多样性（大小写 / 数字 / 符号），
 * 长度不足 6 位（与后端 MinLength(6) 对齐）直接判为最低档；未输入时不渲染。
 */

/** 档位色条与文案颜色（弱→ danger，中→ warning，较强→ accent，强→ success） */
const LEVEL_STYLES = [
  "bg-danger",
  "bg-danger",
  "bg-warning",
  "bg-accent",
  "bg-success",
] as const;

/** 评分 0-4（-1 表示未输入） */
function scorePassword(password: string): number {
  if (!password) return -1;
  if (password.length < 6) return 0;

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  return Math.min(score, 4);
}

export interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({
  password,
  className,
}: PasswordStrengthProps) {
  const { t } = useTranslation();
  const level = useMemo(() => scorePassword(password), [password]);

  if (level < 0) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index <= level ? LEVEL_STYLES[level] : "bg-default",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "shrink-0 text-xs",
          level <= 1 && "text-danger",
          level === 2 && "text-warning",
          level === 3 && "text-accent",
          level === 4 && "text-success",
        )}
      >
        {t(`features.account.password.strength.${level}`)}
      </span>
    </div>
  );
}
