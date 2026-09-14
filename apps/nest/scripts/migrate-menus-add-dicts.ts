import 'dotenv/config';
import 'reflect-metadata';
import { nanoid } from 'nanoid';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../src/db/client';
import { menus, roleMenus } from '../src/db/schema';

/**
 * 幂等迁移：系统管理组新增「字典管理」菜单（to=/settings/dicts）。
 *
 * 背景：i18n 改造阶段 4 的路由-菜单交叉核对发现，前端已有
 * /settings/dicts 路由而菜单缺失；其余菜单 to 已与路由一致。
 *
 * 行为：
 * - 幂等：已存在 i18nKey='menu.dicts' 的菜单则跳过。
 * - 插入字典管理（sort=4），并将原「日志管理」(menu.logs) 的 sort 顺延为 5。
 * - 角色授权：凡已授权「系统管理」组(menu.system)的角色，
 *   沿用其在系统管理组上的授权位授权字典管理（onConflictDoNothing）。
 */

async function main() {
  // 1. 幂等检查
  const existing = await db
    .select({ id: menus.id })
    .from(menus)
    .where(eq(menus.i18nKey, 'menu.dicts'))
    .limit(1);
  if (existing.length > 0) {
    console.log('[migrate-menus-add-dicts] 字典管理菜单已存在，跳过。');
    return;
  }

  // 2. 查找系统管理父级
  const parents = await db
    .select()
    .from(menus)
    .where(eq(menus.i18nKey, 'menu.system'))
    .limit(1);
  if (parents.length === 0) {
    throw new Error('[migrate-menus-add-dicts] 未找到「系统管理」菜单。');
  }
  const parent = parents[0];

  // 3. 日志管理 sort 顺延为 5（字典管理插到其前）
  await db
    .update(menus)
    .set({ sort: 5 })
    .where(and(eq(menus.i18nKey, 'menu.logs'), ne(menus.id, '')));

  // 4. 插入字典管理
  const dictMenuId = nanoid();
  await db.insert(menus).values({
    id: dictMenuId,
    label: '字典管理',
    i18nKey: 'menu.dicts',
    icon: 'book-text',
    to: '/settings/dicts',
    parentId: parent.id,
    sort: 4,
    keepAlive: false,
    hideInMenu: false,
    enabled: true,
    defaultOpen: false,
    permissions: 0n,
  });
  console.log(
    `[migrate-menus-add-dicts] 新增字典管理菜单 id=${dictMenuId} (to=/settings/dicts)。`,
  );

  // 5. 授权：沿用已授权系统管理组的角色的授权位
  const parentAuthRows = await db
    .select({ roleId: roleMenus.roleId, permissions: roleMenus.permissions })
    .from(roleMenus)
    .where(eq(roleMenus.menuId, parent.id));

  for (const auth of parentAuthRows) {
    await db
      .insert(roleMenus)
      .values({
        roleId: auth.roleId,
        menuId: dictMenuId,
        permissions: auth.permissions,
      })
      .onConflictDoNothing();
    console.log(
      `[migrate-menus-add-dicts] 已为角色 ${auth.roleId} 授权字典管理。`,
    );
  }

  console.log('[migrate-menus-add-dicts] 迁移完成。');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-menus-add-dicts] 失败:', err);
    process.exit(1);
  });
