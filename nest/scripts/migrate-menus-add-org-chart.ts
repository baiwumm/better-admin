import 'dotenv/config';
import 'reflect-metadata';
import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../src/db/client';
import { menus, roles, roleMenus } from '../src/db/schema';
import {
  Permissions,
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_ROLE_CODE,
} from '../src/db/schema/permissions.enum';

/**
 * 幂等迁移：存量库补录「架构图谱」子菜单（组织中心阶段 4）。
 *
 * 背景：seed 为 onConflictDoNothing，不会更新已初始化的库；存量库缺这一行
 * 菜单会导致侧边栏无「架构图谱」入口（super_admin 亦然）。
 *
 * 行为（重复执行结果不变，幂等）：
 * 1. i18nKey='menu.org-chart' 子菜单不存在则插入（父级为 menu.org 顶级菜单，
 *    permissions = 常规菜单全量按钮位，无 GRANT）；
 * 2. super_admin 角色对该菜单补 role_menus 全量授权位（SUPER_ADMIN_BITS）。
 *
 * 执行：pnpm tsx scripts/migrate-menus-add-org-chart.ts（模式同 migrate-menus-add-org.ts）。
 */

async function main() {
  // 与 seed.ts 一致的常规菜单全量按钮位（不含 GRANT）
  const menuFullBits =
    Permissions.SEARCH.bits |
    Permissions.ADD.bits |
    Permissions.EDIT.bits |
    Permissions.DELETE.bits |
    Permissions.BATCH_DELETE.bits |
    Permissions.ADD_CHILD.bits |
    Permissions.RESET.bits |
    Permissions.RESET_PASSWORD.bits;

  // 1. 父级菜单：组织中心（migrate-menus-add-org.ts 已补录；缺失时先建父级）
  let [orgMenu] = await db
    .select()
    .from(menus)
    .where(and(eq(menus.i18nKey, 'menu.org'), isNull(menus.parentId)));
  if (!orgMenu) {
    [orgMenu] = await db
      .insert(menus)
      .values({
        id: nanoid(),
        label: '组织中心',
        i18nKey: 'menu.org',
        icon: 'building-2',
        to: '',
        parentId: null,
        sort: 2,
        enabled: true,
        permissions: 0n,
      })
      .returning();
    console.log(`[migrate-menus-add-org-chart] 已插入父级菜单「组织中心」(id=${orgMenu.id})。`);
  }

  // 2. 子菜单：架构图谱
  const [existing] = await db
    .select({ id: menus.id })
    .from(menus)
    .where(
      and(eq(menus.i18nKey, 'menu.org-chart'), eq(menus.parentId, orgMenu.id)),
    );
  let chartMenuId: string;
  if (existing) {
    console.log(
      `[migrate-menus-add-org-chart] 子菜单「架构图谱」已存在(id=${existing.id})，跳过插入。`,
    );
    chartMenuId = existing.id;
  } else {
    const [created] = await db
      .insert(menus)
      .values({
        id: nanoid(),
        label: '架构图谱',
        i18nKey: 'menu.org-chart',
        icon: 'git-fork',
        to: '/org/chart',
        parentId: orgMenu.id,
        sort: 4,
        enabled: true,
        permissions: menuFullBits,
      })
      .returning({ id: menus.id });
    console.log(
      `[migrate-menus-add-org-chart] 已插入子菜单「架构图谱」(id=${created.id})。`,
    );
    chartMenuId = created.id;
  }

  // 3. super_admin 全量授权
  const [superAdminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, SUPER_ADMIN_ROLE_CODE));
  if (!superAdminRole) {
    throw new Error('[migrate-menus-add-org-chart] 未找到 super_admin 角色。');
  }

  await db
    .insert(roleMenus)
    .values({
      roleId: superAdminRole.id,
      menuId: chartMenuId,
      permissions: SUPER_ADMIN_BITS,
    })
    .onConflictDoNothing();
  console.log('[migrate-menus-add-org-chart] super_admin 菜单授权已就绪。');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-menus-add-org-chart] 失败:', err);
    process.exit(1);
  });
