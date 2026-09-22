import 'dotenv/config';
import 'reflect-metadata';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hash } from 'bcrypt';
import { db } from '../src/db/client';
import { users, roles, userRoles } from '../src/db/schema';

/**
 * 开发辅助：创建一个仅绑定 admin 角色的测试账号（testadmin / test123）。
 *
 * ⚠️ 本仓库开发与线上共用同一个 Supabase 库（AGENTS §5），无法按 host 区分环境，
 * 故写库脚本一律要求显式 --confirm——照 demo-reset 的既有安全阀口径。
 * 用法：pnpm ts-node scripts/create-test-user.ts --confirm
 */
(async () => {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const host = dbUrl ? new URL(dbUrl).host : '(未知)';
  console.log(`[create-test-user] 目标数据库：${host}`);

  const confirm = process.argv.includes('--confirm');
  if (!confirm) {
    console.error(
      '\n[create-test-user] 未携带 --confirm，拒绝执行。该脚本会写入弱口令账号，' +
        '确认目标库后运行：pnpm ts-node scripts/create-test-user.ts --confirm',
    );
    process.exitCode = 1;
    return;
  }

  const adminRole = await db.select().from(roles).where(eq(roles.code, 'admin')).limit(1);
  const role = adminRole[0];
  if (!role) {
    console.error('[create-test-user] 未找到 code=admin 的角色，拒绝执行');
    process.exitCode = 1;
    return;
  }

  const uid = nanoid();
  const ph = await hash('test123', 10);
  await db
    .insert(users)
    .values({
      id: uid,
      username: 'testadmin',
      email: 't@b.com',
      passwordHash: ph,
      displayName: '测试管理员',
      status: 'active',
    })
    .onConflictDoNothing();
  await db
    .insert(userRoles)
    .values({ userId: uid, roleId: role.id })
    .onConflictDoNothing();
  console.log('CREATED user=testadmin pwd=test123 role=admin(only)');
  process.exit(0);
})();
