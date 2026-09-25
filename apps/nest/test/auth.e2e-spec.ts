import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, closeTestApp, createTestApp, login, type TestApp } from './setup/test-app';
import { SUPER_ADMIN_BITS_POSITIVE } from '@/db/schema/permissions.enum';

/** 认证链路：登录 / 刷新轮换与重放防护 / 登出撤销。 */
describe('auth e2e', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('admin 登录成功，返回双令牌与归一化全量权限位', async () => {
    const session = await login(app, 'admin', 'admin123');
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.user.username).toBe('admin');
    expect(session.user.permissions).toBe(SUPER_ADMIN_BITS_POSITIVE.toString());
  });

  it('错误密码返回 401 INVALID_CREDENTIALS', async () => {
    const res = await api(app, 'POST', '/auth/login', {
      body: { username: 'admin', password: 'wrong-password-1' },
    });
    expect(res.status).toBe(401);
    expect((res.body as { code: string }).code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh 轮换：旧 refreshToken 换新对，重放旧令牌被拒，新 accessToken 可用', async () => {
    const session = await login(app, 'admin', 'admin123');

    const rotated = await api(app, 'POST', '/auth/refresh', {
      body: { refreshToken: session.refreshToken },
    });
    expect(rotated.status).toBe(200);
    const next = (rotated.body as { data: { accessToken: string; refreshToken: string } }).data;
    expect(next.refreshToken).not.toBe(session.refreshToken);

    // 旧令牌已在轮换事务中删除：重放必须失败
    const replay = await api(app, 'POST', '/auth/refresh', {
      body: { refreshToken: session.refreshToken },
    });
    expect(replay.status).toBe(401);
    expect((replay.body as { code: string }).code).toBe('REFRESH_TOKEN_INVALID');

    const me = await api(app, 'GET', '/auth/me', { token: next.accessToken });
    expect(me.status).toBe(200);
    expect((me.body as { data: { username: string } }).data.username).toBe('admin');
  });

  it('logout（204）后，该 refreshToken 立即不可再换新', async () => {
    const session = await login(app, 'admin', 'admin123');

    const logout = await api(app, 'POST', '/auth/logout', {
      token: session.accessToken,
      body: { refreshToken: session.refreshToken },
    });
    expect(logout.status).toBe(204);
    expect(logout.body).toBeNull();

    const refresh = await api(app, 'POST', '/auth/refresh', {
      body: { refreshToken: session.refreshToken },
    });
    expect(refresh.status).toBe(401);
    expect((refresh.body as { code: string }).code).toBe('REFRESH_TOKEN_INVALID');
  });
});
