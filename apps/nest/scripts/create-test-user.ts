import 'dotenv/config';
import 'reflect-metadata';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hash } from 'bcrypt';
import { db } from '../src/db/client';
import { users, roles, userRoles } from '../src/db/schema';

(async () => {
  const adminRole = await db.select().from(roles).where(eq(roles.code, 'admin')).limit(1);
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
    .values({ userId: uid, roleId: adminRole[0].id })
    .onConflictDoNothing();
  console.log('CREATED user=testadmin pwd=test123 role=admin(only)');
  process.exit(0);
})();
