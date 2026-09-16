/**
 * 演示模式（Phase 0）共享常量。
 *
 * demo-login 端点（auth.service）、log-cleanup 布景保留与
 * scripts/demo-reset.ts faker 重置脚本共用同一真源，避免角色 code /
 * 标记键在服务端与脚本间漂移。
 */

/** 「系统管理员」演示角色 code：快捷登录 admin 池唯一来源 */
export const DEMO_ADMIN_ROLE_CODE = 'sys_admin';

/** 其余四个演示角色 code（快捷登录 random 池两级随机的候选角色） */
export const DEMO_RANDOM_ROLE_CODES = [
  'dept_manager',
  'hr_specialist',
  'employee',
  'guest',
] as const;

/** 快捷登录 random 池排除的角色：super_admin 永不进任何快捷池，admin 单独成池 */
export const DEMO_RANDOM_EXCLUDED_ROLE_CODES = ['super_admin', DEMO_ADMIN_ROLE_CODE];

/**
 * faker 布景日志标记：logs.detail[DEMO_SEED_LOG_DETAIL_KEY] === true 的日志
 * 由 log-cleanup 跳过（永久布景，供 Dashboard 趋势图），真实日志按保留天数滚动。
 */
export const DEMO_SEED_LOG_DETAIL_KEY = 'seed';
