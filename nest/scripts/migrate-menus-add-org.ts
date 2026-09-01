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
 * 幂等迁移：存量库补录「组织中心」顶级菜单与组织管理 / 岗位管理 / 人员通讯录子菜单
 * （契约 v1.6.0，阶段 1 + 阶段 2）。
 *
 * 背景：seed 为 onConflictDoNothing，不会更新已初始化的库；存量库缺这几行
 * 菜单会导致侧边栏无「组织中心」入口（super_admin 亦然）。
 *
 * 行为（重复执行结果不变，幂等）：
 * 1. i18nKey='menu.org' 顶级菜单不存在则插入（sort=2，图标 building-2）；
 * 2. i18nKey='menu.depts' / 'menu.posts' / 'menu.directory' 子菜单不存在则插入
 *    （父级为上一步菜单，permissions = 常规菜单全量按钮位，无 GRANT）；
 * 3. super_admin 角色对以上菜单补 role_menus 全量授权位（SUPER_ADMIN_BITS）。
 */

/** 子菜单定义（与 seed.ts 一致；按 i18nKey 幂等） */
const CHILD_MENUS = [
  {
    i18nKey: 'menu.depts',
    label: '组织管理',
    icon: 'network',
    to: '/org/depts',
    sort: 0,
  },
  {
    i18nKey: 'menu.posts',
    label: '岗位管理',
    icon: 'briefcase',
    to: '/org/posts',
    sort: 1,
  },
  {
    i18nKey: 'menu.directory',
    label: '人员通讯录',
    icon: 'book-user',
    to: '/org/directory',
    sort: 2,
  },
] as const;

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

  // 1. 顶级菜单：组织中心
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
    console.log(`[migrate-menus-add-org] 已插入顶级菜单「组织中心」(id=${orgMenu.id})。`);
  } else {
    console.log(`[migrate-menus-add-org] 顶级菜单已存在(id=${orgMenu.id})，跳过。`);
  }

  // 2. 子菜单：组织管理 / 岗位管理 / 人员通讯录
  const insertedMenuIds: string[] = [orgMenu.id];
  for (const child of CHILD_MENUS) {
    const [existing] = await db
      .select({ id: menus.id })
      .from(menus)
      .where(
        and(eq(menus.i18nKey, child.i18nKey), eq(menus.parentId, orgMenu.id)),
      );
    if (existing) {
      console.log(
        `[migrate-menus-add-org] 子菜单「${child.label}」已存在(id=${existing.id})，跳过。`,
      );
      insertedMenuIds.push(existing.id);
      continue;
    }
    const [created] = await db
      .insert(menus)
      .values({
        id: nanoid(),
        label: child.label,
        i18nKey: child.i18nKey,
        icon: child.icon,
        to: child.to,
        parentId: orgMenu.id,
        sort: child.sort,
        enabled: true,
        permissions: menuFullBits,
      })
      .returning({ id: menus.id });
    console.log(
      `[migrate-menus-add-org] 已插入子菜单「${child.label}」(id=${created.id})。`,
    );
    insertedMenuIds.push(created.id);
  }

  // 3. super_admin 全量授权
  const [superAdminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, SUPER_ADMIN_ROLE_CODE));
  if (!superAdminRole) {
    throw new Error('[migrate-menus-add-org] 未找到 super_admin 角色。');
  }

  await db
    .insert(roleMenus)
    .values(
      insertedMenuIds.map((menuId) => ({
        roleId: superAdminRole.id,
        menuId,
        permissions: SUPER_ADMIN_BITS,
      })),
    )
    .onConflictDoNothing();
  console.log('[migrate-menus-add-org] super_admin 菜单授权已就绪。');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-menus-add-org] 失败:', err);
    process.exit(1);
  });
