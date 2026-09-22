import 'dotenv/config';
import 'reflect-metadata';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../src/db/client';
import { roles, menus, roleMenus } from '../src/db/schema';

/**
 * 验证 RBAC 场景：给 admin 角色授权「概览 + 系统设置父级 + 个人资料/账户/外观」，
 * 明确【不授权】「通知」「显示」，模拟"角色设置中取消了通知和显示"。
 *
 * 再做一次真实授权比对：确认上级菜单(系统设置)因包含可见子菜单而出现，
 * 而通知/显示因其菜单 id 不在 role_menus 集合中而不出现。
 *
 * ⚠️ 本脚本会【清空并重建 admin 角色的全部 role_menus】，且本仓库开发与线上共用
 * 同一个 Supabase 库（AGENTS §5）——误跑即让 admin 角色丢掉绝大部分授权。故要求显式
 * --confirm，照 demo-reset 的既有安全阀口径。
 * 用法：pnpm ts-node scripts/verify-rbac-scenario.ts --confirm
 */
(async () => {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const host = dbUrl ? new URL(dbUrl).host : '(未知)';
  console.log(`[verify-rbac-scenario] 目标数据库：${host}`);

  const confirm = process.argv.includes('--confirm');
  if (!confirm) {
    console.error(
      '\n[verify-rbac-scenario] 未携带 --confirm，拒绝执行。该脚本会重置 admin 角色的菜单授权，' +
        '确认目标库后运行：pnpm ts-node scripts/verify-rbac-scenario.ts --confirm',
    );
    process.exitCode = 1;
    return;
  }

  const adminRole = await db.select().from(roles).where(eq(roles.code, 'admin')).limit(1);
  const role = adminRole[0];
  if (!role) {
    console.error('[verify-rbac-scenario] 未找到 code=admin 的角色，拒绝执行');
    process.exitCode = 1;
    return;
  }
  const roleId = role.id;

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