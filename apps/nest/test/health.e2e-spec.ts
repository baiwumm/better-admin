import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, closeTestApp, createTestApp, type TestApp } from './setup/test-app';

/** 基线冒烟：健康端点、{ data } 成功包络、{ code, message } 错误结构与鉴权门槛。 */
describe('health & baseline e2e', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('GET /health 免鉴权返回 200 与运行时状态（{ data } 包络）', async () => {
    const res = await api(app, 'GET', '/health');
    expect(res.status).toBe(200);
    const data = (res.body as { data: { status: string; uptimeSeconds: number; timestamp: string } })
      .data;
    expect(data.status).toBe('ok');
    expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(data.timestamp).toBeTruthy();
  });

  it('受保护端点未带令牌返回 401 UNAUTHORIZED（顶层错误结构）', async () => {
    const res = await api(app, 'GET', '/users');
    expect(res.status).toBe(401);
    const body = res.body as { code: string; message: string };
    expect(body.code).toBe('UNAUTHORIZED');
    expect(body.message).toBeTruthy();
  });

  it('伪造令牌同样被 401 拒绝', async () => {
    const res = await api(app, 'GET', '/auth/me', { token: 'not-a-real-jwt' });
    expect(res.status).toBe(401);
    expect((res.body as { code: string }).code).toBe('UNAUTHORIZED');
  });
});
