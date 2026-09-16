import { SetMetadata } from '@nestjs/common';

/** 演示只读白名单元数据 key（DemoReadonlyGuard 通过 Reflector 读取） */
export const DEMO_ALLOWED_KEY = 'better_admin_demo_allowed';

/**
 * @DemoAllowed() 标注演示只读白名单端点。
 * DEMO_MODE=true 时 DemoReadonlyGuard 默认拦截所有非 GET 请求，
 * 带本标记的 handler 放行（登录 / 刷新 / 登出 / 快捷登录、站内信已读等
 * 只改自身会话或已读状态的端点）。白名单以装饰器就地声明，不维护路径表。
 */
export const DemoAllowed = () => SetMetadata(DEMO_ALLOWED_KEY, true);
