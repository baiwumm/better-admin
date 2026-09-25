import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/db/client';
import { menus, roleMenus, roles, userRoles, users } from '@/db/schema';
import { Permissions } from '@/db/schema/permissions.enum';

/** 测试口令（合规：8-20 位、字母+数字、可打印 ASCII 无空白）。 */
export const TEST_PASSWORD = 'E2ePass123';

/**
 * 受限角色（幂等）：对 seed 的「用户管理」菜单仅授 SEARCH 位，其余位缺失，
 * 供 RBAC 有位放行 / 无位 403 的两侧断言。
 */
export async function ensureViewerRole(): Promise<string> {
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, 'e2e_viewer'))
    .limit(1);
  if (existing) return existing.id;

  const [role] = await db
    .insert(roles)
    .values({
      id: nanoid(),
      name: 'E2E 受限角色',
      code: 'e2e_viewer',
      description: 'e2e 造数：仅用户管理 SEARCH 位',
      enabled: true,
      sort: 900,
    })
    .returning({ id: roles.id });

  const [menu] = await db
    .select({ id: menus.id })
    .from(menus)
    .where(eq(menus.i18nKey, 'menu.users'))
    .limit(1);
  if (!menu) throw new Error('[e2e] seed 菜单 menu.users 缺失，请检查 global-setup');

  await db
    .insert(roleMenus)
    .values({ roleId: role.id, menuId: menu.id, permissions: Permissions.SEARCH.bits });
  return role.id;
}

/** 造用户并绑定角色（密码统一 TEST_PASSWORD；username 即幂等键）。 */
export async function ensureUserWithRoles(username: string, roleIds: string[]): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) return existing.id;

  const [user] = await db
    .insert(users)
    .values({
      id: nanoid(),
      username,
      email: `${username}@e2e.test`,
      passwordHash: await hash(TEST_PASSWORD, 10),
      displayName: `E2E ${username}`,
      status: 'active',
    })
    .returning({ id: users.id });

  if (roleIds.length > 0) {
    await db
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ userId: user.id, roleId })));
  }
  return user.id;
}

/** 按业务键查 seed 内置角色 id（super_admin / admin），缺失即抛错。 */
export async function findRoleIdByCode(code: string): Promise<string> {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, code))
    .limit(1);
  if (!role) throw new Error(`[e2e] 角色 ${code} 不存在（seed 未执行？）`);
  return role.id;
}
