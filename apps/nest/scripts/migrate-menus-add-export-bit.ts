import 'dotenv/config';
import 'reflect-metadata';
import { eq, sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { menus } from '../src/db/schema';
import { Permissions } from '../src/db/schema/permissions.enum';

/**
 * 幂等迁移：人员通讯录菜单声明位补录 EXPORT(512)（契约 v1.7.1）。
 *
 * 背景：通讯录 Excel 导出按钮新增 EXPORT 位前端门控（无独立端点）；
 * seed 已同步（mDirectory → menuFullBits | EXPORT），但 seed 为
 * onConflictDoNothing，不会更新已初始化的库，存量库中人员通讯录菜单行的
 * permissions 掩码缺 EXPORT 位会导致有导出能力的角色前端按钮不可见。
 *
 * 行为：对 i18nKey='menu.directory' 的菜单行，将 EXPORT 位 OR 进 permissions
 * （sql`${menus.permissions} | ${bit}`，重复执行结果不变，幂等）。
 * super_admin 的 role_menus 为 -1n 全量位，自动覆盖新位，无需处理。
 */
async function main() {
  // pg 驱动不能序列化 JS bigint，位值以字符串参数下发，由 `|` 运算符推断为 bigint
  const exportBit = Permissions.EXPORT.bits.toString();

  const updated = await db
    .update(menus)
    .set({ permissions: sql`${menus.permissions} | ${exportBit}` })
    .where(eq(menus.i18nKey, 'menu.directory'))
    .returning({ id: menus.id });

  if (updated.length === 0) {
    throw new Error('[migrate-menus-add-export-bit] 未找到「人员通讯录」菜单。');
  }

  console.log(
    `[migrate-menus-add-export-bit] 已为人员通讯录菜单(id=${updated[0].id})补录 EXPORT(${exportBit}) 位。`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-menus-add-export-bit] 失败:', err);
    process.exit(1);
  });
