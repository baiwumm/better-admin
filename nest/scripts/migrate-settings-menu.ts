import 'dotenv/config';
import 'reflect-metadata';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { menus, roleMenus } from '../src/db/schema';
import { SUPER_ADMIN_BITS } from '../src/db/schema/permissions.enum';

/**
 * 幂等迁移：将旧的「系统设置」单菜单（to='/settings'）改造为
 * 父级「系统设置」+ 5 个子菜单（个人资料/账户/外观/通知/显示）。
 *
 * 设计对齐：与 src/db/seed.ts 中系统设置结构保持一致。
 * - 旧数据：menus 表中存在 label='系统设置' 且 to='/settings' 的单条记录。
 * - 新数据：该记录变为父级（to=''，parentId=null），并新增 5 条子菜单。
 *
 * 幂等性：
 * - 若已存在「个人资料」子菜单（i18nKey='menu.settings.profile'），则跳过整段迁移。
 * - 角色菜单授权：将新增子菜单 id 授权给 super_admin 全量位。
 */

const SUB_I18N_KEYS = [
  'menu.settings.profile',
  'menu.settings.account',
  'menu.settings.appearance',
  'menu.settings.notifications',
  'menu.settings.display',
];

async function main() {
  // 1. 幂等检查：已迁移则直接退出
  const already = await db
    .select({ id: menus.id })
    .from(menus)
    .where(eq(menus.i18nKey, 'menu.settings.profile'))
    .limit(1);
  if (already.length > 0) {
    console.log('[migrate-settings-menu] 已是最新结构，跳过。');
    return;
  }

  // 2. 查找旧的「系统设置」菜单
  const oldSettings = await db
    .select()
    .from(menus)
    .where(eq(menus.i18nKey, 'menu.settings'))
    .limit(1);
  if (oldSettings.length === 0) {
    console.log('[migrate-settings-menu] 未找到「系统设置」菜单，跳过。');
    return;
  }
  const parent = oldSettings[0];
  console.log(
    `[migrate-settings-menu] 找到旧「系统设置」菜单 id=${parent.id}，准备改造为父级。`,
  );

  // 3. 旧父级转为父容器（to 置空）
  await db
    .update(menus)
    .set({ to: '', parentId: null })
    .where(eq(menus.id, parent.id));

  // 4. 新增 5 个子菜单
  const children = [
    {
      label: '个人资料',
      i18nKey: 'menu.settings.profile',
      icon: 'lucide:user-cog',
      to: '/settings/profile',
      sort: 0,
    },
    {
      label: '账户',
      i18nKey: 'menu.settings.account',
      icon: 'lucide:wrench',
      to: '/settings/account',
      sort: 1,
    },
    {
      label: '外观',
      i18nKey: 'menu.settings.appearance',
      icon: 'lucide:palette',
      to: '/settings/appearance',
      sort: 2,
    },
    {
      label: '通知',
      i18nKey: 'menu.settings.notifications',
      icon: 'lucide:bell',
      to: '/settings/notifications',
      sort: 3,
    },
    {
      label: '显示',
      i18nKey: 'menu.settings.display',
      icon: 'lucide:monitor',
      to: '/settings/display',
      sort: 4,
    },
  ];

  const childIds: string[] = [];
  for (const child of children) {
    const id = nanoid();
    childIds.push(id);
    await db.insert(menus).values({
      id,
      label: child.label,
      i18nKey: child.i18nKey,
      icon: child.icon,
      to: child.to,
      parentId: parent.id,
      sort: child.sort,
      keepAlive: false,
      hideInMenu: false,
      enabled: true,
      defaultOpen: false,
      target: '_self',
      permissions: 0n,
    });
    console.log(
      `[migrate-settings-menu] 新增子菜单 ${child.label} (${child.to}) id=${id}`,
    );
  }

  // 5. 角色菜单授权：将子菜单授权给所有已对父菜单授权的角色（沿用父级授权位）
  const parentAuthRows = await db
    .select({ roleId: roleMenus.roleId, permissions: roleMenus.permissions })
    .from(roleMenus)
    .where(eq(roleMenus.menuId, parent.id));

  for (const auth of parentAuthRows) {
    for (const childId of childIds) {
      await db
        .insert(roleMenus)
        .values({
          roleId: auth.roleId,
          menuId: childId,
          // 沿用父级授权位；若父级是全量（缺省/0 视为继承），使用 SUPER_ADMIN_BITS 兜底
          permissions: auth.permissions ?? SUPER_ADMIN_BITS,
        })
        .onConflictDoNothing();
    }
    console.log(
      `[migrate-settings-menu] 已为角色 ${auth.roleId} 授权 ${childIds.length} 个系统设置子菜单。`,
    );
  }

  console.log('[migrate-settings-menu] 迁移完成。');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-settings-menu] 失败:', err);
    process.exit(1);
  });
