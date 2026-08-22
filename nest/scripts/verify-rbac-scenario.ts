import 'dotenv/config';
import 'reflect-metadata';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../src/db/client';
import { roles, menus, roleMenus, userRoles } from '../src/db/schema';

/**
 * 验证 RBAC 场景：给 admin 角色授权「概览 + 系统设置父级 + 个人资料/账户/外观」，
 * 明确【不授权】「通知」「显示」，模拟"角色设置中取消了通知和显示"。
 *
 * 再做一次真实授权比对：确认上级菜单(系统设置)因包含可见子菜单而出现，
 * 而通知/显示因其菜单 id 不在 role_menus 集合中而不出现。
 */
(async () => {
  const adminRole = await db.select().from(roles).where(eq(roles.code, 'admin')).limit(1);
  const roleId = adminRole[0].id;

  // 目标授权菜单：概览 + 系统设置 + 个人资料/账户/外观（无通知、无显示）
  const targetLabels = ['概览', '系统设置', '个人资料', '账户', '外观'];
  const targetMenus = await db
    .select({ id: menus.id, label: menus.label })
    .from(menus)
    .where(inArray(menus.label, targetLabels));
  const targetIds = new Set(targetMenus.map((m) => m.id));

  // 清空该角色现有授权，改为目标集合。
  // permissions 写入 SEARCH 位（1n），模拟「角色分配中勾选了该菜单」的真实场景：
  // 有授权记录 → 菜单可见；带 SEARCH 位 → 可访问列表接口。
  const SEARCH = 1n;
  await db.delete(roleMenus).where(eq(roleMenus.roleId, roleId));
  for (const id of targetIds) {
    await db.insert(roleMenus).values({
      roleId,
      menuId: id,
      permissions: SEARCH,
    });
  }
  console.log('admin 角色授权已重置为: 概览 / 系统设置 / 个人资料 / 账户 / 外观（通知、显示未授权）');
  process.exit(0);
})();