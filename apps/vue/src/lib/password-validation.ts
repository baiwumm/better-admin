/**
 * 密码策略（契约 v1.8.0）前端预检——与 Nest 端 src/common/validators/password-policy.ts
 * 为同一套规则，任一侧调整须同步；纯函数部分与 react/src/lib/password-validation.ts 逐行相同。
 * 与 React 端的差异：不提供 zod 字段工厂——UForm 直接展示 `issue.message`，翻译须在各表单
 * 的对象级 superRefine 中完成（`t(\`features.users.form.password.${key}\`)`），见两个用户弹窗。
 *
 * - 长度 8-20；仅 ASCII 可打印字符（0x21-0x7E，天然排除空格及任何空白、非 ASCII）；
 *   必须同时包含字母和数字，可含特殊符号；
 * - 不能包含用户名（用户名 ≥3 位时才检查，不区分大小写）；
 * - 不能与原密码相同：前端拿不到原密码，由后端 400 PASSWORD_SAME_AS_OLD 兜底提示。
 * 登录不套用策略，存量不合规密码静默兼容（下次改密时被强制升级）。
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;
/** 用户名短于该长度时跳过包含检查（否则单字符用户名几乎无法设置任何密码） */
export const PASSWORD_USERNAME_CHECK_MIN_LENGTH = 3;

const PRINTABLE_ASCII_PATTERN = /^[\x21-\x7E]+$/;

/** 校验失败原因，即 i18n 文案 key 的末段（调用方按所在模块拼前缀，如 features.users.form.password.*） */
export type PasswordErrorKey =
  | "tooShort"
  | "tooLong"
  | "invalidChars"
  | "missingLetterOrDigit"
  | "containsUsername";

/** 用户名 ≥3 位时做不区分大小写的包含检查 */
export function passwordContainsUsername(
  password: string,
  username?: string | null,
): boolean {
  if (!username || username.length < PASSWORD_USERNAME_CHECK_MIN_LENGTH) {
    return false;
  }

  return password.toLowerCase().includes(username.toLowerCase());
}

/** 返回首个不满足的规则，全部满足返回 null */
export function getPasswordError(
  password: string,
  username?: string | null,
): PasswordErrorKey | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "tooShort";
  if (password.length > PASSWORD_MAX_LENGTH) return "tooLong";
  if (!PRINTABLE_ASCII_PATTERN.test(password)) return "invalidChars";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "missingLetterOrDigit";
  }
  if (passwordContainsUsername(password, username)) return "containsUsername";

  return null;
}
