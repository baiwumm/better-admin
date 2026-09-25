import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureViewerRole, TEST_PASSWORD } from './setup/fixtures';
import { api, closeTestApp, createTestApp, login, type TestApp } from './setup/test-app';
import { Permissions, SUPER_ADMIN_BITS_POSITIVE } from '@/db/schema/permissions.enum';

/**
 * RBAC 权限聚合（每请求实时 OR 聚合）：受限角色有位放行 / 无位 403、
 * 角色停用后权限即时回收、超管全量位免检。
 */
describe('rbac e2e', () => {
  let app: TestApp;
  let viewerToken: string;
  let adminToken: string;
  let viewerRoleId: string;

  beforeAll(async () => {
    app = await createTestApp();
    viewerRoleId = await ensureViewerRole();
    viewerToken = (await login(app, 'e2e_viewer', TEST_PASSWORD)).accessToken;
    adminToken = (await login(app, 'admin', 'admin123')).accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('受限角色的 /auth/me 聚合位恰为所授权限（SEARCH=1）', async () => {
    const me = await api(app, 'GET', '/auth/me', { token: viewerToken });
    expect(me.status).toBe(200);
    expect((me.body as { data: { permissions: string } }).data.permissions).toBe(
      Permissions.SEARCH.bits.toString(),
    );
  });

  it('有位端点放行：viewer 可查用户列表（SEARCH 位）', async () => {
    const res = await api(app, 'GET', '/users', { token: viewerToken });
    expect(res.status).toBe(200);
    // 列表响应为 { data, pagination }
    expect((res.body as { data: unknown[] }).data).toBeInstanceOf(Array);
  });

  it('无位端点 403：viewer 无 ADD 位，新建用户被拒', async () => {
    const res = await api(app, 'POST', '/users', {
      token: viewerToken,
      body: {
        username: 'e2e_denied',
        email: 'e2e_denied@e2e.test',
        password: 'SomePass123',
        displayName: '不应被创建',
      },
    });
    expect(res.status).toBe(403);
    const body = res.body as { code: string; message: string };
    expect(body.code).toBe('FORBIDDEN');
    expect(body.message).toBe('无权限');
  });

  it('角色停用后权限即时回收（旧令牌立即 403），恢复启用后放行', async () => {
    const disable = await api(app, 'PUT', `/roles/${viewerRoleId}`, {
      token: adminToken,
      body: { enabled: false },
    });
    expect(disable.status).toBe(200);

    const denied = await api(app, 'GET', '/users', { token: viewerToken });
    expect(denied.status).toBe(403);

    const restore = await api(app, 'PUT', `/roles/${viewerRoleId}`, {
      token: adminToken,
      body: { enabled: true },
    });
    expect(restore.status).toBe(200);

    const allowed = await api(app, 'GET', '/users', { token: viewerToken });
    expect(allowed.status).toBe(200);
  });

  it('超管聚合位为归一化全量位（2^63-1），任意图标端点免检', async () => {
    const me = await api(app, 'GET', '/auth/me', { token: adminToken });
    expect(me.status).toBe(200);
    expect((me.body as { data: { permissions: string } }).data.permissions).toBe(
      SUPER_ADMIN_BITS_POSITIVE.toString(),
    );

    // DELETE 位 / RESET_PASSWORD 位等 admin 均未逐项授予（全量位聚合），守卫必须放行
    const list = await api(app, 'GET', '/roles', { token: adminToken });
    expect(list.status).toBe(200);
  });
});
