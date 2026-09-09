/** 系统内置超级管理员角色 code（角色页按钮门控 / 表单锁定 / 授权抽屉保护统一引用）。 */
export const SUPER_ADMIN_ROLE_CODE = "super_admin";

/**
 * 密码输入上限（契约 v1.7.3）：72 为 bcrypt 输入上限，超长输入会被
 * 静默截断，前端与后端 DTO @MaxLength(72) 同规拦截。
 */
export const PASSWORD_MAX_LENGTH = 72;

/**
 * i18n 键格式校验正则（点分隔，如 dict.user_status.enabled）。
 * - 必须以字母开头
 * - 各段允许字母、数字、下划线
 * - 至少包含一个点号（两级以上）
 */
export const I18N_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/;

/**
 * 字典类型 code 格式校验正则。
 * - 必须以字母开头
 * - 允许字母、数字、下划线、中划线
 */
export const DICT_TYPE_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
