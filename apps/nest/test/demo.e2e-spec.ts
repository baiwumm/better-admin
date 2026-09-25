import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureUserWithRoles,
  ensureViewerRole,
  findRoleIdByCode,
  TEST_PASSWORD,
} from './setup/fixtures';
import { api, closeTestApp, createTestApp, login, type TestApp } from './setup/test-app';
import { db } from '@/db/client';
import { roles } from '@/db/schema';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

/**
 * 演示模式（契约 v1.10.0）：只读守卫 / demo-login 两级随机 / 白名单。
 *
 * DEMO_MODE 由守卫每请求读取 process.env（非模块级常量），可在同进程内切换：
 * 先用常规 app（false）断言 demo-login 404，再切 true 起 demo app 验证守卫行为。
 */
describe('demo mode e2e', () => {
  let app: TestApp;
  let demoApp: TestApp;
  /** 关闭态探测结果：it 执行时 env 已切换，必须在 beforeAll 内采样 */
  let closedDemoLoginStatus: number;

  beforeAll(async () => {
    // 造演示池布景：seed 只建 super_admin/admin 角色与 admin 用户，演示角色不在 seed 内
    const viewerRoleId = await ensureViewerRole();
    await ensureUserWithRoles('e2e_viewer', [viewerRoleId]);
    await ensureUserWithRoles('e2e_demo_admin', [await ensureSysAdminRole()]);
    // seed 的 admin 角色在 random 池内但无绑定用户：补一个，保证两级随机必命中真实用户
    await ensureUserWithRoles('e2e_pool_admin', [await findRoleIdByCode('admin')]);

    app = await createTestApp();
    closedDemoLoginStatus = (
      await api(app, 'POST', '/auth/demo-login', { body: { kind: 'admin' } })
    ).status;
    process.env.DEMO_MODE = 'true';
    demoApp = await createTestApp();
  });

  afterAll(async () => {
    process.env.DEMO_MODE = 'false';
    await closeTestApp(demoApp);
    await closeTestApp(app);
  });

  /** sys_admin（演示管理员池角色）不在 seed 与排除清单外，需自建。 */
  async function ensureSysAdminRole(): Promise<string> {
    const [existing] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, 'sys_admin'))
      .limit(1);
    if (existing) return existing.id;
    const [role] = await db
      .insert(roles)
      .values({ id: nanoid(), name: 'E2E 系统管理员', code: 'sys_admin', enabled: true, sort: 901 })
      .returning({ id: roles.id });
    return role.id;
  }

  it('DEMO_MODE=false 时 demo-login 返回 404（与常规部署一致）', async () => {
    expect(closedDemoLoginStatus).toBe(404);
  });

  it('DEMO_MODE=true 时未登录写请求被只读守卫拦截（先于鉴权，403 DEMO_READONLY）', async () => {
    const res = await api(demoApp, 'POST', '/users', { body: { username: 'x' } });
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('DEMO_READONLY');
  });

  it('kind=admin 固定命中演示管理员角色（sys_admin）用户', async () => {
    const res = await api(demoApp, 'POST', '/auth/demo-login', { body: { kind: 'admin' } });
    expect(res.status).toBe(200);
    expect((res.body as { data: { user: { username: string } } }).data.user.username).toBe(
      'e2e_demo_admin',
    );
  });

  it('kind=random 两级随机命中池内用户，且永不命中超管 admin', async () => {
    const pool = new Set(['e2e_viewer', 'e2e_pool_admin']);
    for (let i = 0; i < 5; i++) {
      // 轮间 >1s：refresh token JWT 无 jti、iat 秒级精度，同一用户同秒二次登录会
      // 签发完全相同的令牌串，撞 refresh_tokens.token_hash 唯一索引 500（已知缺陷，
      // 待拍板修法，见 progress 登记）。测试侧规避以保证套件确定性。
      await new Promise((resolve) => setTimeout(resolve, 1_100));
      const res = await api(demoApp, 'POST', '/auth/demo-login', { body: { kind: 'random' } });
      expect(res.status).toBe(200);
      const username = (res.body as { data: { user: { username: string } } }).data.user.username;
      expect(pool.has(username)).toBe(true);
    }
  }, 20_000);

  it('登录端点在白名单内：DEMO_MODE=true 下账号密码登录照常放行', async () => {
    // global-setup 强制 SEED_ADMIN_PASSWORD=admin123，凭据可预测
    const session = await login(demoApp, 'admin', 'admin123');
    expect(session.user.username).toBe('admin');
  });

  it('demo 会话登出在白名单内（204），读端点未登录仍 401', async () => {
    const session = await api(demoApp, 'POST', '/auth/demo-login', {
      body: { kind: 'admin' },
    }).then((r) => (r.body as { data: { accessToken: string } }).data);

    const anonymous = await api(demoApp, 'GET', '/users');
    expect(anonymous.status).toBe(401);

    const logout = await api(demoApp, 'POST', '/auth/logout', {
      token: session.accessToken,
    });
    expect(logout.status).toBe(204);
  });

  it('notifications 已读端点在白名单内：已登录用户可写自身已读状态', async () => {
    const session = await login(demoApp, 'e2e_viewer', TEST_PASSWORD);
    const res = await api(demoApp, 'POST', '/notifications/read-all', {
      token: session.accessToken,
    });
    expect(res.status).toBe(200);
  });
});
