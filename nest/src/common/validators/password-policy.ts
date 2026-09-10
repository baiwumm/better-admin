import { BadRequestException } from '@nestjs/common';
import { registerDecorator, type ValidationOptions } from 'class-validator';
import * as bcrypt from 'bcrypt';

/**
 * 密码策略（契约 v1.8.0），三个设置密码入口共用同一口径：
 * POST /users（初始密码）、POST /users/:id/reset-password、PUT /account/password。
 * React 端 src/lib/password-validation.ts 为同一套规则的前端预检副本，任一侧调整须同步。
 *
 * 格式规则（DTO 层 @IsPolicyPassword，不符 → 400 VALIDATION_ERROR）：
 * - 长度 8-20；
 * - 仅允许 ASCII 可打印字符（0x21-0x7E），天然排除空格及任何空白、非 ASCII（中文 / emoji 等）；
 * - 必须同时包含字母和数字，可含特殊符号。
 * 业务规则（跨字段 / 需查库，由 service 层调用断言函数）：
 * - 不能包含用户名（用户名 ≥3 位时才检查，不区分大小写）→ 400 PASSWORD_CONTAINS_USERNAME；
 * - 不能与当前密码相同（bcrypt 比对现有 hash）→ 400 PASSWORD_SAME_AS_OLD。
 * 登录不校验策略：存量不合规密码静默兼容，下次改密时被强制升级。
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;
/** 用户名短于该长度时跳过包含检查（否则单字符用户名几乎无法设置任何密码） */
export const PASSWORD_USERNAME_CHECK_MIN_LENGTH = 3;

const PRINTABLE_ASCII_PATTERN = /^[\x21-\x7E]+$/;

export type PasswordFormatError =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_CHARS'
  | 'MISSING_LETTER_OR_DIGIT';

/** 格式校验（不含跨字段规则）：返回首个不满足的规则，全部满足返回 null */
export function getPasswordFormatError(
  password: string,
): PasswordFormatError | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'TOO_SHORT';
  if (password.length > PASSWORD_MAX_LENGTH) return 'TOO_LONG';
  if (!PRINTABLE_ASCII_PATTERN.test(password)) return 'INVALID_CHARS';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'MISSING_LETTER_OR_DIGIT';
  }
  return null;
}

export function passwordContainsUsername(
  password: string,
  username: string | null | undefined,
): boolean {
  if (!username || username.length < PASSWORD_USERNAME_CHECK_MIN_LENGTH) {
    return false;
  }
  return password.toLowerCase().includes(username.toLowerCase());
}

/** 密码含用户名 → 400 PASSWORD_CONTAINS_USERNAME */
export function assertPasswordNotContainingUsername(
  password: string,
  username: string | null | undefined,
): void {
  if (passwordContainsUsername(password, username)) {
    throw new BadRequestException({
      code: 'PASSWORD_CONTAINS_USERNAME',
      message: '密码不能包含用户名',
    });
  }
}

/** 新密码与当前 hash 匹配 → 400 PASSWORD_SAME_AS_OLD */
export async function assertPasswordNotSameAsCurrent(
  newPassword: string,
  currentPasswordHash: string,
): Promise<void> {
  if (await bcrypt.compare(newPassword, currentPasswordHash)) {
    throw new BadRequestException({
      code: 'PASSWORD_SAME_AS_OLD',
      message: '新密码不能与当前密码相同',
    });
  }
}

/**
 * DTO 属性装饰器：密码格式校验，失败走 class-validator 管道（400 VALIDATION_ERROR）。
 * 命名避开 class-validator 内置的 IsStrongPassword（其规则为大小写 + 符号数量制，与本项目策略不同）。
 */
export function IsPolicyPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isPolicyPassword',
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' && getPasswordFormatError(value) === null
          );
        },
        defaultMessage(): string {
          return `密码须为 ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} 位，仅可包含字母、数字与可打印符号（不含空格），且必须同时包含字母和数字`;
        },
      },
    });
  };
}
