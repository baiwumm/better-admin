import 'dotenv/config';
import 'reflect-metadata';
import { eq, sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { menus, roles, roleMenus } from '../src/db/schema';
import {
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_ROLE_CODE,
} from '../src/db/schema/permissions.enum';

/**
 * 幂等回填：为 super_admin 补齐缺失的 role_menus 授权记录。
 *
 * 背景（`docs/launch-audit.md` #9）：progress.md 早期条目记为「super_admin role_menus
 * 仅 24/28，缺 exception 三页 + 主题切换动画页」。本轮实测纠正为：**菜单共 30 条、
 * super_admin 已有 26 条，缺的是异常页 1 个目录 + 403/404/500 三个子页共 4 条**；
 * theme-switch-animation 与全部 playground 页面早已由各
 * `migrate-menus-add-playground-*.ts` 脚本自带授权。两个数字与缺口的构成都变了，
 * 差值 4 恰好相同，故该记录长期没被发现有问题。
 *
 * 为什么仍要补：super_admin 的「全量可见」实际靠聚合出的 -1n 全量位免检（见
 * `auth.service.aggregatePermissions` 与 AGENTS §19「super_admin 保护设计依据」），
 * 所以补与不补**当前行为无差异**。但「超管应有全量授权记录」是一条数据不变量，
 * 留着缺口意味着：一旦有人按记录而非按位掩码判断超管范围（或将来重算/迁移授权表），
 * 异常页会静默变成不可见。属零风险的数据一致性收口。
 *
 * 行为（重复执行结果不变）：
 * 1. 找出所有「在 menus 中存在、但 super_admin 无对应 role_menus 行」的菜单；
 * 2. 逐条插入 permissions = SUPER_ADMIN_BITS（-1n，与既有 26 行同值）；
 * 3. 只 INSERT，绝不 UPDATE / DELETE 任何既有授权行。
 *
 * 执行：pnpm ts-node scripts/migrate-menus-add-super-admin-grants.ts
 */

const TAG = '[migrate-super-admin-grants]';

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '';
  console.log(`${TAG} 目标数据库：${dbUrl ? new URL(dbUrl).host : '(未知)'}`);

  const [superAdmin] = await db
    .select({ id: roles.id, code: roles.code })
    .from(roles)
    .where(eq(roles.code, SUPER_ADMIN_ROLE_CODE))
    .limit(1);

  if (!superAdmin) {
    throw new Error(`${TAG} 未找到 code=${SUPER_ADMIN_ROLE_CODE} 的角色，拒绝执行`);
  }

  // 缺失清单：菜单存在但超管无授权记录（用 not exists 而非内存差集，避免分页/时窗偏差）
  const missing = await db
    .select({ id: menus.id, label: menus.label, i18nKey: menus.i18nKey })
    .from(menus)
    .where(
      sql`not exists (
        select 1 from ${roleMenus} rm
        where rm.${sql.identifier('menu_id')} = ${menus.id}
          and rm.${sql.identifier('role_id')} = ${superAdmin.id}
      )`,
    );

  console.log(
    `${TAG} 待补授权 ${missing.length} 条：` +
      missing.map((m) => `${m.i18nKey ?? m.label}(${m.id})`).join(', '),
  );

  if (missing.length === 0) {
    console.log(`${TAG} ✓ 无缺口，未做任何写入（幂等）`);
    return;
  }

  await db.insert(roleMenus).values(
    missing.map((m) => ({
      roleId: superAdmin.id,
      menuId: m.id,
      permissions: SUPER_ADMIN_BITS,
    })),
  );

  const [after] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(roleMenus)
    .where(eq(roleMenus.roleId, superAdmin.id));

  console.log(
    `${TAG} ✓ 已补 ${missing.length} 条，super_admin 授权记录总数 = ${after?.n}（与 menus 总数一致即为闭环）`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`${TAG} 执行失败:`, error);
    process.exit(1);
  });
