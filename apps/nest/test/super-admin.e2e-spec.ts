import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureUserWithRoles, findRoleIdByCode } from './setup/fixtures';
import { api, closeTestApp, createTestApp, login, type TestApp } from './setup/test-app';
import { db } from '@/db/client';
import { userRoles } from '@/db/schema';
import { SUPER_ADMIN_BITS_POSITIVE, SUPER_ADMIN_ROLE_CODE } from '@/db/schema/permissions.enum';

/**
 * super_admin 双重保护（不可变量，AGENTS §19 勿推翻项）：
 * - 角色侧：super_admin 角色不可改授权 / 删除 / 停用（403 SUPER_ADMIN_ROLE_PROTECTED）；
 * - 绑定侧：系统至少保留一个启用中的超管绑定（403 SUPER_ADMIN_LAST_PROTECTED）。
 * 全部用例自恢复：收尾时 e2e schema 整体删除，进程内绑定也恢复到初始态。
 */
describe('super admin protection e2e', () => {
  let app: TestApp;
  let adminToken: string;
  let adminUserId: string;
  let superRoleId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await login(app, 'admin', 'admin123');
    adminToken = session.accessToken;
    adminUserId = session.user.id;
    superRoleId = await findRoleIdByCode(SUPER_ADMIN_ROLE_CODE);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('PUT /roles/{super_admin}/menus 改授权被拒（SUPER_ADMIN_ROLE_PROTECTED）', async () => {
    const res = await api(app, 'PUT', `/roles/${superRoleId}/menus`, {
      token: adminToken,
      body: { menus: [] },
    });
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('SUPER_ADMIN_ROLE_PROTECTED');
  });

  it('DELETE /roles/{super_admin} 被拒（SUPER_ADMIN_ROLE_PROTECTED）', async () => {
    const res = await api(app, 'DELETE', `/roles/${superRoleId}`, { token: adminToken });
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('SUPER_ADMIN_ROLE_PROTECTED');
  });

  it('停用 super_admin 角色被拒（SUPER_ADMIN_ROLE_PROTECTED）', async () => {
    const res = await api(app, 'PUT', `/roles/${superRoleId}`, {
      token: adminToken,
      body: { enabled: false },
    });
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('SUPER_ADMIN_ROLE_PROTECTED');
  });

  it('仅剩一个活跃超管时自摘绑定被拒（SUPER_ADMIN_LAST_PROTECTED）', async () => {
    // seed 后 admin 是唯一活跃超管
    const res = await api(app, 'PUT', `/users/${adminUserId}`, {
      token: adminToken,
      body: { roleIds: [] },
    });
    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe('SUPER_ADMIN_LAST_PROTECTED');
  });

  it('存在第二个活跃超管时摘绑放行，摘绑后原超管权限即时归零', async () => {
    const secondId = await ensureUserWithRoles('e2e_super2', [superRoleId]);

    const unbind = await api(app, 'PUT', `/users/${adminUserId}`, {
      token: adminToken,
      body: { roleIds: [] },
    });
    expect(unbind.status).toBe(200);

    const me = await api(app, 'GET', '/auth/me', { token: adminToken });
    expect(me.status).toBe(200);
    expect((me.body as { data: { permissions: string } }).data.permissions).toBe('0');

    // 现场恢复：admin 绑回 super_admin（e2e schema 收尾会整体删除，这里只保证 spec 内后续用例）
    await db.insert(userRoles).values({ userId: adminUserId, roleId: superRoleId }).onConflictDoNothing();
    const restored = await api(app, 'GET', '/auth/me', { token: adminToken });
    expect(restored.status).toBe(200);
    expect((restored.body as { data: { permissions: string } }).data.permissions).toBe(
      SUPER_ADMIN_BITS_POSITIVE.toString(),
    );

    // 清理第二个超管绑定：恢复「仅 admin 一个活跃超管」的初始态（admin 已恢复超管身份，放行）
    const cleanup = await api(app, 'PUT', `/users/${secondId}`, {
      token: adminToken,
      body: { roleIds: [] },
    });
    expect(cleanup.status).toBe(200);
  });
});
