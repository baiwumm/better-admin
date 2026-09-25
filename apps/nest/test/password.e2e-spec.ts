import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureUserWithRoles,
  ensureViewerRole,
  TEST_PASSWORD,
} from './setup/fixtures';
import { api, closeTestApp, createTestApp, login, type TestApp } from './setup/test-app';

/**
 * 密码策略（契约 v1.8.0）：格式校验（DTO 层 400 VALIDATION_ERROR）、
 * 跨字段校验（service 层 PASSWORD_CONTAINS_USERNAME / PASSWORD_SAME_AS_OLD）、
 * 改密后 tokenVersion 使存量令牌全量失效。
 *
 * 使用独立用户 e2e_pwuser，改密副作用不外溢到其他 spec。
 */
describe('password policy e2e', () => {
  let app: TestApp;
  let adminToken: string;
  let pwUserId: string;
  let pwUserToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = (await login(app, 'admin', 'admin123')).accessToken;
    const viewerRoleId = await ensureViewerRole();
    pwUserId = await ensureUserWithRoles('e2e_pwuser', [viewerRoleId]);
    pwUserToken = (await login(app, 'e2e_pwuser', TEST_PASSWORD)).accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it.each([
    ['短于 8 位', 'abc12'],
    ['长于 20 位', 'a'.repeat(21)],
    ['纯字母无数字', 'nodigitshere'],
    ['含空白字符', 'has space123'],
  ])('弱密码（%s）返回 400 VALIDATION_ERROR', async (_label, newPassword) => {
    const res = await api(app, 'POST', `/users/${pwUserId}/reset-password`, {
      token: adminToken,
      body: { newPassword },
    });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('含用户名的密码返回 400 PASSWORD_CONTAINS_USERNAME', async () => {
    const res = await api(app, 'POST', `/users/${pwUserId}/reset-password`, {
      token: adminToken,
      body: { newPassword: 'x-e2e_pwuser-9A' },
    });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe('PASSWORD_CONTAINS_USERNAME');
  });

  it('自助改密与新密码相同返回 400 PASSWORD_SAME_AS_OLD', async () => {
    const res = await api(app, 'PUT', '/account/password', {
      token: pwUserToken,
      body: { currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD },
    });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe('PASSWORD_SAME_AS_OLD');
  });

  it('合法自助改密成功后：存量 accessToken 因 tokenVersion 递增而 401，新密码可登录', async () => {
    const changed = await api(app, 'PUT', '/account/password', {
      token: pwUserToken,
      body: { currentPassword: TEST_PASSWORD, newPassword: 'NewPass456' },
    });
    expect(changed.status).toBe(200);

    const stale = await api(app, 'GET', '/auth/me', { token: pwUserToken });
    expect(stale.status).toBe(401);
    expect((stale.body as { code: string }).code).toBe('UNAUTHORIZED');

    const relogin = await api(app, 'POST', '/auth/login', {
      body: { username: 'e2e_pwuser', password: 'NewPass456' },
    });
    expect(relogin.status).toBe(200);
    expect(
      (relogin.body as { data: { user: { username: string } } }).data.user.username,
    ).toBe('e2e_pwuser');
  });
});
