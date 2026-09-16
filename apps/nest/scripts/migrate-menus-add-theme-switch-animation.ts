import 'dotenv/config';
import 'reflect-metadata';
import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../src/db/client';
import { menus, roles, roleMenus } from '../src/db/schema';
import {
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_ROLE_CODE,
} from '../src/db/schema/permissions.enum';

/**
 * 幂等迁移：演示场补录「主题切换动画」子菜单（theme-switch-animation）。
 *
 * 背景：菜单是四端共用的单点数据源。演示场目录与既有 7 个演示页由
 * migrate-menus-add-playground.ts 一次性录入；本页是后续追加项，故按仓库惯例
 * 单独建脚本（migrate-menus-add-<feature>.ts），不重跑已执行过的脚本。
 *
 * 行为（重复执行结果不变，幂等）：
 * 1. 按 i18nKey='menu.playground.themeSwitchAnimation' 查重，不存在则插入到
 *    「演示场」（menu.playground）之下，sort=4 排在 GitHub Activity 之后；
 * 2. permissions = 0——纯展示页不声明按钮位；可见性由 role_menus 关联决定
 *    （「有记录即可见」，见 MenusService.buildAllowedMenuIds）；
 * 3. super_admin 补 role_menus 全量位（SUPER_ADMIN_BITS）；其余角色不做默认授权，
 *    需在「角色管理」勾选后才可见（未授权角色不可见且路由不可达）。
 *
 * 页面实现状态：React 端已实现，Next / Vue / Nuxt 尚未对齐（点击会 404），
 * 属预期——四端对齐后再补录其余端页面。
 *
 * 执行：pnpm tsx scripts/migrate-menus-add-theme-switch-animation.ts
 */

const TAG = '[migrate-menus-add-theme-switch-animation]';

async function main() {
  // 1. 父级：演示场目录（playground 脚本已录入；缺失说明该脚本尚未执行）
  const [playgroundMenu] = await db
    .select({ id: menus.id })
    .from(menus)
    .where(
      and(eq(menus.i18nKey, 'menu.playground'), isNull(menus.parentId)),
    );
  if (!playgroundMenu) {
    throw new Error(
      `${TAG} 未找到「演示场」目录（menu.playground）。请先执行 migrate-menus-add-playground.ts。`,
    );
  }

  // 2. 子菜单：主题切换动画（页面节点：keepAlive 开启；纯展示页 permissions = 0）
  const [existing] = await db
    .select({ id: menus.id })
    .from(menus)
    .where(
      and(
        eq(menus.i18nKey, 'menu.playground.themeSwitchAnimation'),
        eq(menus.parentId, playgroundMenu.id),
      ),
    );

  let menuId: string;
  if (existing) {
    console.log(`${TAG} 子菜单「主题切换动画」已存在(id=${existing.id})，跳过插入。`);
    menuId = existing.id;
  } else {
    const [created] = await db
      .insert(menus)
      .values({
        id: nanoid(),
        label: '主题切换动画',
        i18nKey: 'menu.playground.themeSwitchAnimation',
        icon: 'sun-moon',
        to: '/playground/theme-switch-animation',
        parentId: playgroundMenu.id,
        sort: 4,
        keepAlive: true,
        enabled: true,
        permissions: 0n,
      })
      .returning({ id: menus.id });
    menuId = created.id;
    console.log(
      `${TAG} 已插入页面「主题切换动画」(id=${menuId}, to=/playground/theme-switch-animation)。`,
    );
  }

  // 3. super_admin 补录全量授权位（其余角色由「角色管理」按需关联）
  const [superAdminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, SUPER_ADMIN_ROLE_CODE));
  if (!superAdminRole) {
    throw new Error(`${TAG} 未找到 super_admin 角色。`);
  }

  await db
    .insert(roleMenus)
    .values({
      roleId: superAdminRole.id,
      menuId,
      permissions: SUPER_ADMIN_BITS,
    })
    .onConflictDoNothing();
  console.log(`${TAG} super_admin 菜单授权已就绪。`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`${TAG} 失败:`, err);
    process.exit(1);
  });
