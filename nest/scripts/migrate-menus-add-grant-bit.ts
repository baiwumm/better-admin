import 'dotenv/config';
import 'reflect-metadata';
import { eq, sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { menus } from '../src/db/schema';
import { Permissions } from '../src/db/schema/permissions.enum';

/**
 * 幂等迁移：角色管理菜单声明位补录 GRANT(256)（契约 v1.4.4）。
 *
 * 背景：PUT /roles/:id/menus 的权限要求由 EDIT 收敛为独立 GRANT 位；
 * seed 已同步，但 seed 为 onConflictDoNothing，不会更新已初始化的库，
 * 存量库中角色管理菜单行的 permissions 掩码缺 GRANT 位会导致
 * 授权抽屉无法为角色勾选/下发该位（前端授权入口随之不可见）。
 *
 * 行为：对 i18nKey='menu.roles' 的菜单行，将 GRANT 位 OR 进 permissions
 * （sql`${menus.permissions} | ${bit}`，重复执行结果不变，幂等）。
 * super_admin 的 role_menus 为 -1n 全量位，自动覆盖新位，无需处理。
 */
async function main() {
  // pg 驱动不能序列化 JS bigint，位值以字符串参数下发，由 `|` 运算符推断为 bigint
  const grantBit = Permissions.GRANT.bits.toString();

  const updated = await db
    .update(menus)
    .set({ permissions: sql`${menus.permissions} | ${grantBit}` })
    .where(eq(menus.i18nKey, 'menu.roles'))
    .returning({ id: menus.id });

  if (updated.length === 0) {
    throw new Error('[migrate-menus-add-grant-bit] 未找到「角色管理」菜单。');
  }

  console.log(
    `[migrate-menus-add-grant-bit] 已为角色管理菜单(id=${updated[0].id})补录 GRANT(${grantBit}) 位。`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-menus-add-grant-bit] 失败:', err);
    process.exit(1);
  });
