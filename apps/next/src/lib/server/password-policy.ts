import "server-only";

import bcrypt from "bcryptjs";

import { ServerApiError } from "@/lib/server/http";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getPasswordError,
  passwordContainsUsername,
} from "@/lib/password-validation";

/**
 * 密码策略服务端断言（契约 v1.8.0，与 nest/src/common/validators/password-policy.ts 一一对齐），
 * 三个设置密码入口共用同一口径：POST /api/users（初始密码）、POST /api/users/:id/reset-password、
 * PUT /api/account/password。规则本体在同构模块 @/lib/password-validation（与 web 表单预检同一份），
 * 此处只做「规则 → ServerApiError」映射与需查库的比对：
 * - 格式项（长度 / 字符集 / 字母+数字）由路由层断言 → 400 VALIDATION_ERROR（等价 nest DTO 管道）；
 * - 不能包含用户名 → 400 PASSWORD_CONTAINS_USERNAME、不能与当前密码相同 → 400 PASSWORD_SAME_AS_OLD
 *   （service 层断言，依赖已查出的用户行）。
 * 登录不校验策略：存量不合规密码静默兼容，下次改密时被强制升级。
 */

/** 格式不符 → 400 VALIDATION_ERROR（跨字段的用户名项见 assertPasswordNotContainingUsername） */
export function assertPasswordFormat(password: string): void {
  if (getPasswordError(password) !== null) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      `密码须为 ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} 位，仅可包含字母、数字与可打印符号（不含空格），且必须同时包含字母和数字`,
    );
  }
}

/** 密码含用户名 → 400 PASSWORD_CONTAINS_USERNAME */
export function assertPasswordNotContainingUsername(
  password: string,
  username: string | null | undefined,
): void {
  if (passwordContainsUsername(password, username)) {
    throw new ServerApiError(
      400,
      "PASSWORD_CONTAINS_USERNAME",
      "密码不能包含用户名",
    );
  }
}

/** 新密码与当前 hash 匹配 → 400 PASSWORD_SAME_AS_OLD */
export async function assertPasswordNotSameAsCurrent(
  newPassword: string,
  currentPasswordHash: string,
): Promise<void> {
  if (await bcrypt.compare(newPassword, currentPasswordHash)) {
    throw new ServerApiError(
      400,
      "PASSWORD_SAME_AS_OLD",
      "新密码不能与当前密码相同",
    );
  }
}
